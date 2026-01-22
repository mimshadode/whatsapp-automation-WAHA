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
      
      // Dynamic Acknowledgment for CREATE_FORM
      if (intent === BotIntent.CREATE_FORM) {
        await this.sendAcknowledgment(message, context);
      }
      
      const response = await tool.execute(message, context);
      
      return response.reply;
    }

    return this.getOutOfScopeResponse();
  }

  private async detectIntent(message: string): Promise<BotIntent> {
    const prompt = `Analyze the user message and identify the intent.
    
INTENTS:
- IDENTITY: Asking who you are, what you can do, greeting, or calling you by name (John, Joni, Jon Jon).
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

  private async sendAcknowledgment(message: string, context: ToolContext): Promise<void> {
    try {
      const name = (context.senderName && context.senderName !== '.') ? context.senderName : '';
      console.log(`[AIOrchestrator] Sending acknowledgment for: ${name || 'Unknown (Generic)'}`);
      
      const prompt = `Anda adalah asisten WhatsApp yang sedang memproses permintaan pembuatan Google Form.
Tugas Anda adalah membalas pesan user dengan konfirmasi bahwa Anda SEDANG MULAI mengerjakan form tersebut.

VARIABEL:
- Nama User: "${name}"
- Pesan User: "${message}"

ATURAN BALASAN:
1. Jika Nama User tersedia (bukan kosong), Anda WAJIB menyapa dengan nama tersebut di AWAL pesan.
   - Gunakan nama depan atau panggilan yang akrab.
   - Contoh: "Siap Kak [Nama]...", "Baik Kak [Nama]...", "Oke Kak [Nama]...".
2. Jika Nama User kosong, gunakan sapaan ramah (seperti "Kak", "Sobat", dll).
3. Identifikasi judul form dari pesan user. Jika tidak jelas gunakan "form-nya".
4. Gunakan kalimat "sedang diproses" atau "mohon tunggu sebentar".
5. DILARANG menggunakan kata "sudah siap" atau "berhasil dibuat" di pesan ini.
6. HANYA keluarkan teks balasannya saja (STRICTLY TEXT ONLY).

USER MESSAGE: "${message}"`;

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

  private getOutOfScopeResponse(): string {
    return (
      "Maaf 🙏🏽, saya hanya dapat membantu terkait:\n" +
      "• Pembuatan Google Form\n" +
      "• Pengecekan jadwal Google Calendar\n\n" +
      "Permintaan di luar itu belum dapat saya proses."
    );
  }
}
