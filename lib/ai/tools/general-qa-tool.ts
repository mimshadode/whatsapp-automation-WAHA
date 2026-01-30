import { AITool, ToolContext, ToolResponse } from "../types";
import { BiznetGioClient } from "@/lib/biznetgio-client";
import { Prompts } from "../prompts";

/**
 * General Question Answering Tool
 * Handles any general questions that don't fall into specific tool categories
 */
export class GeneralQATool implements AITool {
  name = "General Q&A";
  description =
    "Menjawab pertanyaan umum seputar Google Forms, produktivitas, dan topik terkait";

  private biznet: BiznetGioClient;

  constructor() {
    this.biznet = new BiznetGioClient();
  }

  getSystemPrompt(): string {
    return Prompts.generalQA;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log(
        `[GeneralQATool] Processing question: ${query.substring(0, 100)}...`,
      );

      // Get conversation context if available
      const sessionState = context.sessionState || {};
      const conversationHistory = sessionState.conversationHistory || [];

      // Build context string for AI if not already in query (orchestrator adds reply context)
      let contextStr = "";
      const hasEmbeddedContext = query.includes("[KONTEKS PESAN YANG DIBALAS]");

      if (!hasEmbeddedContext && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-3); // Last 3 exchanges
        contextStr =
          "\n\nKONTEKS PERCAKAPAN SEBELUMNYA:\n" +
          recentHistory
            .map((h: any) => `User: ${h.user}\nBot: ${h.bot}`)
            .join("\n");
      }

      // Priority: Detect language and tone from the CURRENT query
      let systemPrompt = this.getSystemPrompt();
      const botName = sessionState.metadata?.botName;

      if (botName) {
        console.log(`[GeneralQATool] Using dynamic bot name: ${botName}`);
        // Replace default name definition with dynamic one
        systemPrompt = systemPrompt.replace(
          /Nama: Clarahexa \/ Clara\./g,
          `Nama: ${botName}.`,
        );
        systemPrompt = systemPrompt.replace(
          /benama Clarahexa \(bisa dipanggil Clara\)\./g,
          `bernama ${botName}.`,
        );
        // Add explicit instruction to override any other identity
        systemPrompt += `\n\nPENTING: Nama kamu sekarang adalah "${botName}". Lupakan nama Clarahexa/Clara jika ditanya siapa namamu.`;
      }

      const fullPrompt =
        systemPrompt +
        contextStr +
        "\n\nPENTING: Hasilkan jawaban dalam bahasa yang SAMA dengan [PESAN USER] di bawah.";
      let response = await this.biznet.generateSpecificResponse(
        fullPrompt,
        query,
      );

      // Post-processing: Strip bold formatting (asterisks) from response
      // Regex: Replace **text** or *text* with just text
      response = response.replace(/\*\*([^*]+)\*\*/g, "$1"); // Remove **bold**
      response = response.replace(/\*([^*]+)\*/g, "$1"); // Remove *italic*

      console.log("[GeneralQATool] Response generated successfully");

      // Check if bot agreed to a name change
      // Pattern: "Oke, panggil saya [Name] mulai sekarang"
      let newBotName = null;
      const nameChangeMatch = response.match(
        /panggil saya\s+([a-zA-Z0-9\s]+?)\s+mulai sekarang/i,
      );
      if (nameChangeMatch && nameChangeMatch[1]) {
        newBotName = nameChangeMatch[1];
        console.log(`[GeneralQATool] Detected name change to: ${newBotName}`);
      }

      // Update session state with new metadata if name changed
      const currentMetadata = sessionState.metadata || {};
      const updatedMetadata = newBotName
        ? { ...currentMetadata, botName: newBotName }
        : currentMetadata;

      // Update conversation history
      const updatedHistory = [
        ...conversationHistory,
        { user: query, bot: response },
      ].slice(-5); // Keep last 5 exchanges

      return {
        success: true,
        reply: response.trim(),
        newState: {
          conversationHistory: updatedHistory,
          metadata: updatedMetadata,
        },
      };
    } catch (error: any) {
      console.error("[GeneralQATool] Error:", error.message);

      return {
        success: false,
        reply:
          "Maaf, saya sedang mengalami kendala teknis. Coba tanya lagi sebentar lagi ya! 😊",
      };
    }
  }
}
