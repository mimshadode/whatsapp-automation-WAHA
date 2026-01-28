import { BiznetGioClient } from '@/lib/biznetgio-client';
import { WAHAClient } from '@/lib/waha-client';
import { AITool, BotIntent, ToolContext, ToolResponse } from './types';
import { GoogleFormCreatorTool } from './tools/google-form-creator';
import { ScheduleCheckerTool } from './tools/schedule-checker';
import { FormAnalyticsTool } from './tools/form-analytics';
import { Prompts } from './prompts';

export class AIOrchestrator {
  private biznet: BiznetGioClient;
  private waha: WAHAClient;
  private tools: Map<BotIntent, AITool>;

  constructor(waha: WAHAClient) {
    this.biznet = new BiznetGioClient();
    this.waha = waha;
    this.tools = new Map();
    this.tools.set(BotIntent.CREATE_FORM, new GoogleFormCreatorTool());
    this.tools.set(BotIntent.CHECK_SCHEDULE, new ScheduleCheckerTool());
    this.tools.set(BotIntent.CHECK_RESPONSES, new FormAnalyticsTool());
  }

  async handleMessage(message: string, context: ToolContext & { messageId?: string }): Promise<ToolResponse> {
    const chatId = context.phoneNumber; // This is the chatId
    const messageId = context.messageId;

    const intent = await this.detectIntent(message);

    if (intent === BotIntent.IDENTITY) {
      return { success: true, reply: this.getIdentityResponse() };
    }

    if (intent === BotIntent.ACKNOWLEDGMENT) {
      return { success: true, reply: this.getAcknowledgmentResponse() };
    }

    if (intent === BotIntent.CLARIFICATION) {
      const clarificationResponse = await this.handleClarification(message, context);
      return { success: true, reply: clarificationResponse };
    }

    if (this.tools.has(intent)) {
      const tool = this.tools.get(intent)!;
      
      // Dynamic Acknowledgment for CREATE_FORM
      if (intent === BotIntent.CREATE_FORM) {
        await this.sendAcknowledgment(message, context);
      }
      
      const response = await tool.execute(message, context);
      
      return response;
    }

    return { success: false, reply: this.getOutOfScopeResponse() };
  }

  private async detectIntent(message: string): Promise<BotIntent> {
    const lowerMsg = message.toLowerCase().trim();
    
    // Quick check: If message contains form-related keywords, prioritize CHECK_RESPONSES or CREATE_FORM
    const formKeywords = ['form', 'formulir', 'responden', 'mengisi', 'isi', 'daftar', 'berapa', 'siapa'];
    const hasFormKeywords = formKeywords.some(k => lowerMsg.includes(k));
    
    // Quick check: Follow-up request patterns that rely on previous context
    const followUpPatterns = ['sertakan', 'tambahkan', 'dengan email', 'emailnya', 'lihat email', 'tampilkan email'];
    const isFollowUpRequest = followUpPatterns.some(p => lowerMsg.includes(p));
    
    // Hard check: If message contains extracted document text, it's always CREATE_FORM
    const hasExtractedText = message.includes('[TEKS DARI MEDIA]') || message.includes('[TEKS DARI FILE YANG DIBALAS]');
    if (hasExtractedText) {
      console.log('[AIOrchestrator] Detected extracted document text → CREATE_FORM intent');
      return BotIntent.CREATE_FORM;
    }
    
    // Quick check: Very short clarification questions (less than 30 chars and no form keywords)
    const clarificationPatterns = ['apa maksudnya', 'maksudnya apa', 'jelaskan', 'artinya apa', 'apa itu'];
    const isClarification = clarificationPatterns.some(p => lowerMsg.includes(p)) && !hasFormKeywords;
    
    if (isClarification) {
      return BotIntent.CLARIFICATION;
    }
    
    // If it's a follow-up request (like "sertakan emailnya"), treat as CHECK_RESPONSES
    // This will be handled with session context
    if (isFollowUpRequest) {
      return BotIntent.CHECK_RESPONSES;
    }

    const prompt = Prompts.detectIntent(message);

    const response = await this.biznet.generateSpecificResponse(prompt, message);
    const intentStr = response.trim().toUpperCase();

    if (intentStr.includes('IDENTITY')) return BotIntent.IDENTITY;
    if (intentStr.includes('ACKNOWLEDGMENT')) return BotIntent.ACKNOWLEDGMENT;
    if (intentStr.includes('CREATE_FORM')) return BotIntent.CREATE_FORM;
    if (intentStr.includes('CHECK_RESPONSES')) return BotIntent.CHECK_RESPONSES;
    if (intentStr.includes('CHECK_SCHEDULE')) return BotIntent.CHECK_SCHEDULE;

    return BotIntent.UNKNOWN;
  }

  private async sendAcknowledgment(message: string, context: ToolContext): Promise<void> {
    try {
      const name = (context.senderName && context.senderName !== '.') ? context.senderName : '';
      console.log(`[AIOrchestrator] Sending acknowledgment for: ${name || 'Unknown (Generic)'}`);
      
      const prompt = Prompts.acknowledgment(name, message);

      const ackResponse = await this.biznet.generateSpecificResponse(prompt, message);
      
      // Send the acknowledgment immediately
      await this.waha.sendText(context.phoneNumber, ackResponse.trim());
    } catch (error) {
      console.error('[AIOrchestrator] Error sending acknowledgment:', error);
      // Fail silently and let the main flow continue
    }
  }

  private getIdentityResponse(): string {
    return (
      "Halo! 👋 Saya *John* (bisa dipanggil Joni juga), asisten berbasis kecerdasan buatan yang dapat membantu Anda:\n" +
      "• Membuat Google Form secara otomatis\n" +
      "• Mengecek jadwal atau agenda dari Google Calendar\n\n" +
      "Silakan beri tahu apa yang ingin Anda buat atau cek hari ini. 😊"
    );
  }

  private getAcknowledgmentResponse(): string {
    const responses = [
      "Siap! Ada lagi yang bisa saya bantu? 😊",
      "Oke! Kalau ada yang mau dibuat atau dicek lagi, tinggal bilang ya!",
      "Sama-sama! Saya siap bantu kapan saja.",
      "Baik! Kalau butuh bantuan lagi, langsung chat aja ya 👍"
    ];
    // Return random response
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getOutOfScopeResponse(): string {
    return (
      "Maaf 🙏🏽, saya hanya dapat membantu terkait:\n" +
      "• Pembuatan Google Form\n" +
      "• Pengecekan jadwal Google Calendar\n\n" +
      "Permintaan di luar itu belum dapat saya proses."
    );
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
