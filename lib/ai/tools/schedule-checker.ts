import { AITool, ToolContext, ToolResponse } from "../types";
import { BiznetGioClient } from "@/lib/biznetgio-client";

export class ScheduleCheckerTool implements AITool {
  name = "Schedule Checker";
  description = "Membantu mengecek jadwal atau agenda dari Google Calendar";

  private biznet: BiznetGioClient;

  constructor() {
    this.biznet = new BiznetGioClient();
  }

  getSystemPrompt(): string {
    return `You are a helpful calendar assistant named Clarahexa.

🌍 LANGUAGE RULE (CRITICAL):
- DETECT the language used by the user
- ALWAYS respond in the SAME language as the user
- If user writes in English → RESPOND IN ENGLISH
- If user writes in Indonesian → RESPOND IN INDONESIAN

⛔ FORMAT RULES:
- DO NOT use asterisks (*) for bold formatting
- Keep responses short (2-3 sentences max)

CURRENT STATUS:
The calendar checking feature is still under development. 
Inform the user politely that this feature is coming soon.
Suggest they can still use the Google Forms creation feature.`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log(
        "[ScheduleCheckerTool] Processing query:",
        query.substring(0, 50),
      );

      const response = await this.biznet.generateSpecificResponse(
        this.getSystemPrompt(),
        query,
      );

      // Strip any asterisks from response
      const cleanResponse = response
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1");

      console.log("[ScheduleCheckerTool] Response generated");

      return {
        success: true,
        reply: cleanResponse.trim(),
      };
    } catch (error: any) {
      console.error("[ScheduleCheckerTool] Error:", error.message);
      return {
        success: false,
        reply: "Sorry, I encountered an issue. Please try again later.",
      };
    }
  }
}
