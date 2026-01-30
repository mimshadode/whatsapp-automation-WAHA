import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';

/**
 * User Authorization Tool
 * 
 * Allows authorized users to grant temporary bot access to other users in groups.
 * Example: "Clara, kamu harus balas pesan dari @user"
 */
export class UserAuthorizationTool implements AITool {
  name = 'User Authorization';
  description = 'Memberikan akses temporary kepada user lain untuk menggunakan bot';

  private biznet: BiznetGioClient;

  constructor() {
    this.biznet = new BiznetGioClient();
  }

  getSystemPrompt(): string {
    return `Anda sedang memproses permintaan untuk memberikan akses temporary bot kepada user lain.

TUGAS ANDA:
1. Konfirmasi bahwa Anda akan membalas pesan dari user yang disebutkan
2. Buat respons yang ramah dan jelas

RESPONS YANG BAIK:
- "Oke! Saya akan membalas pesan dari @[nama] untuk sesi ini 👍 Akses berlaku selama 24 jam."
- "Siap! @[nama] sekarang bisa menggunakan bot. Akses temporary 24 jam ya!"

ATURAN:
- Gunakan bahasa Indonesia yang santai dan ramah
- Sebutkan durasi akses (24 jam)
- Singkat dan jelas
- Maksimal 2 baris

Buat konfirmasi yang natural!`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log('[UserAuthTool] Processing authorization request');

      // Get mentioned users from context
      const mentionedUsers = context.mentionedUsers || [];
      const sender = context.sender;
      const senderName = context.senderName || 'User';

      if (mentionedUsers.length === 0) {
        return {
          success: true,
          reply: 'Hmm, saya tidak melihat user yang disebutkan. Coba mention user yang ingin diberi akses ya! 😊'
        };
      }

      // Check if sender is authorized (should be checked by orchestrator, but double-check)
      const allowedUsers = process.env.ALLOWED_GROUP_USERS?.split(',').map(u => u.trim()) || [];
      if (!allowedUsers.includes(sender || '')) {
        return {
          success: true,
          reply: 'Maaf, hanya admin yang bisa memberikan izin akses bot 🙏'
        };
      }

      // Calculate expiry (24 hours from now)
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

      // Get current session state
      const sessionState = context.sessionState || {};
      const groupId = context.phoneNumber;

      // Initialize temp permissions structure
      const tempUsers = sessionState.temporaryAllowedUsers || {};
      if (!tempUsers[groupId]) {
        tempUsers[groupId] = [];
      }

      // Add new users (or update existing)
      for (const userJid of mentionedUsers) {
        // Check if user already has access
        const existingIndex = tempUsers[groupId].findIndex((u: any) => u.userId === userJid);
        
        const accessEntry = {
          userId: userJid,
          grantedBy: sender,
          grantedByName: senderName,
          grantedAt: now,
          expiresAt: expiresAt
        };

        if (existingIndex >= 0) {
          // Update existing entry (refresh expiry)
          tempUsers[groupId][existingIndex] = accessEntry;
          console.log(`[UserAuthTool] Updated temp access for ${userJid}`);
        } else {
          // Add new entry
          tempUsers[groupId].push(accessEntry);
          console.log(`[UserAuthTool] Granted temp access to ${userJid} by ${sender}`);
        }
      }

      // Generate friendly confirmation using AI
      const confirmationPrompt = `User ${senderName} memberikan akses temporary kepada ${mentionedUsers.length} user. Buat konfirmasi yang ramah!`;
      
      const confirmation = await this.biznet.generateSpecificResponse(
        this.getSystemPrompt(),
        confirmationPrompt
      );

      return {
        success: true,
        reply: confirmation.trim(),
        newState: {
          ...sessionState,
          temporaryAllowedUsers: tempUsers
        }
      };

    } catch (error: any) {
      console.error('[UserAuthTool] Error:', error.message);
      
      return {
        success: false,
        reply: 'Maaf, ada kendala saat memberikan akses. Coba lagi ya! 😊'
      };
    }
  }
}
