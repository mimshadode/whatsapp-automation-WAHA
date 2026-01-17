import { BiznetGioClient } from '@/lib/biznetgio-client';
import { WAHAClient } from '@/lib/waha-client';
import { AITool, BotIntent, ToolContext, ToolResponse } from './types';
import { GoogleFormCreatorTool } from './tools/google-form-creator';
import { ScheduleCheckerTool } from './tools/schedule-checker';

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
  }

  async handleMessage(message: string, context: ToolContext & { messageId?: string }): Promise<string> {
    const chatId = context.phoneNumber; // This is the chatId
    const messageId = context.messageId;

    const intent = await this.detectIntent(message);

    if (intent === BotIntent.IDENTITY) {
      return this.getIdentityResponse();
    }

    if (this.tools.has(intent)) {
      const tool = this.tools.get(intent)!;
      
      // Notify user that we are working on it (Long running process)
      await this.waha.startTyping(chatId, messageId);
      
      const response = await tool.execute(message, context);
      
      await this.waha.stopTyping(chatId);

      return response.reply;
    }

    return this.getOutOfScopeResponse();
  }

  private async detectIntent(message: string): Promise<BotIntent> {
    const prompt = `Analyze the user message and identify the intent.
    
INTENTS:
- IDENTITY: Asking who you are, what you can do, greeting.
- CREATE_FORM: Requesting to create a form or survey.
- CHECK_SCHEDULE: Asking about schedule, calendar, or agenda.
- UNKNOWN: Anything else.

USER MESSAGE: "${message}"

OUTPUT: Only output the INTENT NAME (e.g. CREATE_FORM).`;

    const response = await this.biznet.generateSpecificResponse(prompt, message);
    const intentStr = response.trim().toUpperCase();

    if (intentStr.includes('IDENTITY')) return BotIntent.IDENTITY;
    if (intentStr.includes('CREATE_FORM')) return BotIntent.CREATE_FORM;
    if (intentStr.includes('CHECK_SCHEDULE')) return BotIntent.CHECK_SCHEDULE;

    return BotIntent.UNKNOWN;
  }

private getIdentityResponse(): string {
  return (
    "Halo! 👋 Saya adalah asisten berbasis kecerdasan buatan yang dapat membantu Anda:\n" +
    "• Membuat Google Form secara otomatis\n" +
    "• Mengecek jadwal atau agenda dari Google Calendar\n\n" +
    "Silakan beri tahu apa yang ingin Anda buat atau cek hari ini. 😊"
  );
}

private getOutOfScopeResponse(): string {
  return (
    "Maaf 🙏🏽, saya hanya dapat membantu terkait:\n" +
    "• Pembuatan Google Form\n" +
    "• Pengecekan jadwal Google Calendar\n\n" +
    "Permintaan di luar itu belum dapat saya proses."
  );
}

}
