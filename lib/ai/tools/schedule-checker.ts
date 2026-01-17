import { AITool, ToolContext, ToolResponse } from '../types';

export class ScheduleCheckerTool implements AITool {
  name = 'Schedule Checker';
  description = 'Membantu mengecek jadwal atau agenda dari Google Calendar';

  getSystemPrompt(): string {
    return `You are a helpful calendar assistant. 
Your goal is to inform the user about their schedule.
Currently, I am in STUB mode (testing connectivity).
Always be friendly and professional.`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    // TODO: Implement actual Google Calendar API call
    return {
      success: true,
      reply: `Halo! Saya adalah asisten yang dapat membantu Anda dalam membuat atau mengecek jadwal.\n\nFitur pengecekan kalender sedang dalam tahap finalisasi teknis. Untuk saat ini, saya sudah terhubung namun belum bisa mengambil data agenda secara real-time. Ada hal lain yang bisa saya bantu?`,
    };
  }
}
