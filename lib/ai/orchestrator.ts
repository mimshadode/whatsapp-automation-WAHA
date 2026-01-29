import { BiznetGioClient } from '@/lib/biznetgio-client';
import { WAHAClient } from '@/lib/waha-client';
import { AITool, BotIntent, ToolContext, ToolResponse } from './types';
import { GoogleFormCreatorTool } from './tools/google-form-creator';
import { FormContributorTool } from './tools/form-contributor';
import { ScheduleCheckerTool } from './tools/schedule-checker';
import { FormAnalyticsTool } from './tools/form-analytics';
import { GeneralQATool } from './tools/general-qa-tool';
import { Prompts } from './prompts';

export class AIOrchestrator {
  private biznet: BiznetGioClient;
  private waha: WAHAClient;
  private tools: Map<BotIntent, AITool>;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.waha = new WAHAClient();
    this.tools = new Map();
    
    // Core Tools
    this.tools.set(BotIntent.CREATE_FORM, new GoogleFormCreatorTool());
    this.tools.set(BotIntent.SHARE_FORM, new FormContributorTool());
    this.tools.set(BotIntent.CHECK_SCHEDULE, new ScheduleCheckerTool());
    this.tools.set(BotIntent.CHECK_RESPONSES, new FormAnalyticsTool());
    
    // AI Conversational Tool (One Brain for all chatter)
    const qaTool = new GeneralQATool();
    this.tools.set(BotIntent.GENERAL_QA, qaTool);
    this.tools.set(BotIntent.IDENTITY, qaTool);        // AI handles greeting
    this.tools.set(BotIntent.ACKNOWLEDGMENT, qaTool);  // AI handles thanks
    this.tools.set(BotIntent.UNKNOWN, qaTool);         // AI handles fallback
  }

  async handleMessage(message: string, context: ToolContext & { messageId?: string }): Promise<ToolResponse> {
    const chatId = context.phoneNumber;
    const messageId = context.messageId;

    // Prepend reply context to message if available
    let processedMessage = message;
    if (context.replyContext && context.replyContext.trim().length > 0) {
      console.log(`[AIOrchestrator] Reply context detected: "${context.replyContext.substring(0, 50)}..."`);
      
      // Clean up context: If context contains bot examples like "Coba ketik:", strip them
      // to avoid triggering false intents from old bot messages
      let cleanContext = context.replyContext
        .replace(/Coba ketik:.*$/i, '')
        .replace(/Try typing:.*$/i, '')
        .trim();
        
      processedMessage = `[KONTEKS PESAN YANG DIBALAS]:\n"${cleanContext}"\n\n[PESAN USER]:\n${message}`;
    }

    let intent = await this.detectIntent(processedMessage);

    // Special handling for clarification: keep it simple for now, or move to AI later
    if (intent === BotIntent.CLARIFICATION) {
      const clarificationResponse = await this.handleClarification(processedMessage, context);
      return { success: true, reply: clarificationResponse };
    }

    // Force UNKNOWN to use the registered tool (GeneralQATool)
    // No need to remap manually, it's already in the map
    
    if (this.tools.has(intent)) {
      const tool = this.tools.get(intent)!;
      
      // Dynamic Acknowledgment for CREATE_FORM
      if (intent === BotIntent.CREATE_FORM) {
        await this.sendAcknowledgment(processedMessage, context);
      }
      
      const response = await tool.execute(processedMessage, context);
      
      return response;
    }

    // Fallback if tool not found (should be covered by UNKNOWN mapping above)
    // But just in case:
    const fallbackTool = this.tools.get(BotIntent.UNKNOWN)!;
    return await fallbackTool.execute(processedMessage, context);
  }

  private async detectIntent(message: string): Promise<BotIntent> {
    const lowerMsg = message.toLowerCase().trim();
    
    // Quick check: Capability questions (asking if bot CAN do something)
    const capabilityPatterns = [
      'apakah kamu bisa',
      'apakah anda bisa',
      'bisa gak',
      'bisa nggak',
      'bisa tidak',
      'bisa kah',
      'bisa buatkan',
      'bisa buat',
      'kamu bisa apa',
      'anda bisa apa',
      'fitur apa',
      'fungsi apa'
    ];
    
    const isCapabilityQuestion = capabilityPatterns.some(p => lowerMsg.includes(p));
    if (isCapabilityQuestion) {
      console.log('[AIOrchestrator] Detected capability question → GENERAL_QA intent');
      return BotIntent.GENERAL_QA;
    }
    
    // Quick check: If message contains form-related keywords, prioritize CHECK_RESPONSES or CREATE_FORM
    const formKeywords = ['form', 'formulir', 'responden', 'mengisi', 'isi', 'daftar', 'berapa', 'siapa'];
    const hasFormKeywords = formKeywords.some(k => lowerMsg.includes(k));
    
    // Hard check: If message contains extracted document text, it's always CREATE_FORM
    const hasExtractedText = message.includes('[TEKS DARI MEDIA]') || message.includes('[TEKS DARI FILE YANG DIBALAS]');
    if (hasExtractedText) {
      console.log('[AIOrchestrator] Detected extracted document text → CREATE_FORM intent');
      return BotIntent.CREATE_FORM;
    }

    // Rule-based shortcut: Common "create Google Form" phrasing
    // Helps reliably catch requests like:
    // "Buatkan google formulir pendaftaran tarik ulur perasaan batch 3.
    //  Url nya bit.ly/lomba-batch-3. Dengan deskripsi yang menarik,
    //  nama, alamat, dan nomor HP Masukan mimshad@mail.com sebagai editor."
    const createFormPatterns = [
      'buatkan google form',
      'buat google form',
      'buatkan google formulir',
      'buat google formulir',
      'buatkan formulir',
      'buat formulir',
      'buatkan form',
      'buat form',
      'formulir pendaftaran',
      'form pendaftaran',
      'link pendaftaran',
    ];

    // EXCEPTION: If user is asking for EXAMPLE phrases/commands, route to GENERAL_QA
    // This prevents "contoh kata-kata untuk membuat form" from triggering CREATE_FORM
    const examplePhrasePatterns = [
      'contoh kata',
      'contoh kalimat',
      'contoh perintah',
      'contoh pesan',
      'bagaimana cara',
      'cara membuat',
      'apa yang harus',
      'gimana caranya',
      'caranya gimana',
      'cara bikin',
      'beritahui contoh',  // From the screenshot issue
      'kasih contoh',
      'berikan contoh',
    ];
    
    const isAskingForExample = examplePhrasePatterns.some(p => lowerMsg.includes(p));
    
    if (isAskingForExample) {
      console.log('[AIOrchestrator] Detected EXAMPLE request → routing to GENERAL_QA');
      return BotIntent.GENERAL_QA;
    }

    if (createFormPatterns.some(p => lowerMsg.includes(p))) {
      console.log('[AIOrchestrator] Detected rule-based CREATE_FORM intent');
      return BotIntent.CREATE_FORM;
    }

    // Quick check: Very short clarification questions (less than 30 chars and no form keywords)
    const clarificationPatterns = ['apa maksudnya', 'maksudnya apa', 'jelaskan', 'artinya apa', 'apa itu'];
    
    // Strict Clarification Logic:
    // 1. Must match a pattern
    // 2. Must be SHORT (< 40 chars)
    // 3. Must NOT contain "kamu" or "anda" (because "jelaskan siapa kamu" is IDENTITY/QA, not clarification)
    // 4. Must NOT have form keywords
    const isClarification = clarificationPatterns.some(p => lowerMsg.includes(p)) && 
                           !hasFormKeywords && 
                           message.length < 40 &&
                           !lowerMsg.includes('kamu') && 
                           !lowerMsg.includes('anda') &&
                           !lowerMsg.includes('siapa');
    
    if (isClarification) {
      console.log('[AIOrchestrator] Detected simple CLARIFICATION intent');
      return BotIntent.CLARIFICATION;
    }

    const prompt = Prompts.detectIntent(message);

    const response = await this.biznet.generateSpecificResponse(prompt, message);
    const intentStr = response.trim().toUpperCase();

    if (intentStr.includes('IDENTITY')) return BotIntent.IDENTITY;
    if (intentStr.includes('ACKNOWLEDGMENT')) return BotIntent.ACKNOWLEDGMENT;
    if (intentStr.includes('CREATE_FORM')) return BotIntent.CREATE_FORM;
    if (intentStr.includes('CHECK_RESPONSES')) return BotIntent.CHECK_RESPONSES;
    if (intentStr.includes('SHARE_FORM')) return BotIntent.SHARE_FORM;
    if (intentStr.includes('CHECK_SCHEDULE')) return BotIntent.CHECK_SCHEDULE;
    if (intentStr.includes('GENERAL_QA')) return BotIntent.GENERAL_QA;

    return BotIntent.UNKNOWN;
  }

  private async sendAcknowledgment(message: string, context: ToolContext): Promise<void> {
    try {
      const name = (context.senderName && context.senderName !== '.') ? context.senderName : '';
      console.log(`[AIOrchestrator] Sending acknowledgment for: ${name || 'Unknown (Generic)'}`);
      
      const prompt = Prompts.acknowledgment(name, message);

      const ackResponse = await this.biznet.generateSpecificResponse(prompt, message);
      
      // Send the acknowledgment immediately
      await this.waha.sendText(context.phoneNumber, ackResponse.trim(), context.messageId);
    } catch (error) {
      console.error('[AIOrchestrator] Error sending acknowledgment:', error);
      // Fail silently and let the main flow continue
    }
  }



  private async handleClarification(message: string, context: ToolContext): Promise<string> {
    try {
      // Get last bot response from session state for context
      const lastBotResponse = context.sessionState?.lastBotResponse || '';
      const lastFormTitle = context.sessionState?.lastFormId ? 
        `Form yang baru saja dibahas: ${context.sessionState.lastFormTitle || 'Form terbaru'}` : '';
      
      const prompt = Prompts.clarification(message, {
        lastBotResponse,
        lastFormTitle
      });

      const response = await this.biznet.generateSpecificResponse(prompt, message);
      return response.trim();
    } catch (error) {
      console.error('[AIOrchestrator] Error handling clarification:', error);
      return "Maaf, bisa jelaskan lebih detail apa yang ingin Anda tanyakan? 🤔";
    }
  }
}
