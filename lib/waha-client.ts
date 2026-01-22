import axios, { AxiosInstance } from 'axios';

export class WAHAClient {
  private client: AxiosInstance;
  private sessionName: string;

  constructor() {
    this.sessionName = 'default';
    this.client = axios.create({
      baseURL: process.env.WAHA_API_URL || 'http://localhost:5000',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.WAHA_API_KEY,
      },
    });
  }

  /**
   * Set presence state for a specific chat or globally
   * presences: 'online' | 'offline' | 'typing' | 'recording' | 'paused'
   */
  async setPresence(presence: 'online' | 'offline' | 'typing' | 'recording' | 'paused', chatId?: string) {
    try {
      const payload: any = { presence };
      if (chatId) {
        payload.chatId = chatId;
      }
      
      // Documentation says: POST /api/{session}/presence
      await this.client.post(`/api/${this.sessionName}/presence`, payload);
    } catch (error) {
      console.error('[WAHA Client] Error setting presence:', presence, error);
      // Non-blocking error
    }
  }

  /**
   * Mark all messages in a chat as seen (read)
   */
  /**
   * Mark specific message as seen (read)
   */
  async sendSeen(chatId: string, messageId?: string) {
    try {
      // Use the correct endpoint for marking messages as read with messageId
      const url = '/api/sendSeen';
      const payload: any = {
        session: this.sessionName,
        chatId: chatId,
      };

      if (messageId) {
        payload.messageIds = [messageId];
      }

      // console.log('[WAHA Client] Sending seen payload:', JSON.stringify(payload));
      await this.client.post(url, payload);
    } catch (error: any) {
      console.error('[WAHA Client] Error marking chat as seen:', chatId, error.message);
      if (error.response) {
        console.error('[WAHA Client] Error Details:', JSON.stringify(error.response.data));
      }
      // Non-blocking error
    }
  }

  async startTyping(chatId: string, messageId?: string) {
    // It's natural to mark as seen before typing
    await this.sendSeen(chatId, messageId);
    await this.setPresence('typing', chatId);
  }

  async stopTyping(chatId: string) {
    await this.setPresence('paused', chatId);
  }

  /**
   * Send text with simulated human behavior (typing indicator + random delay)
   */
  async sendText(chatId: string, text: string, mentions?: string[]) {
    try {
      // 1. Start typing
      await this.startTyping(chatId);

      // 2. Random delay (2-5 seconds) to simulate reading/thinking
      // Calculate delay based on length? For now random is safe enough
      const minDelay = 2000; 
      const maxDelay = 4000;
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      
      console.log(`[WAHA Client] Simulating human typing for ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // 3. Send message
      const payload: any = {
        session: this.sessionName,
        chatId,
        text,
        linkPreview: false // Disable link previews as requested
      };

      if (mentions && mentions.length > 0) {
        payload.mentions = mentions;
      }

      const response = await this.client.post('/api/sendText', payload);

      // 4. Stop typing (usually automatic after send, but good practice to be explicit if needed, 
      // though WAHA/WhatsApp might handle this. 'paused' signals stop typing)
      await this.stopTyping(chatId);

      return response.data;
    } catch (error) {
      console.error('[WAHA Client] Error sending text:', error);
      throw error;
    }
  }

  async sendImage(chatId: string, imageUrl: string, caption: string) {
    try {
        // Note: Check strict API spec for sendImage if file/url param differs
      const response = await this.client.post('/api/sendImage', {
        session: this.sessionName,
        chatId,
        file: {
            url: imageUrl
        },
        caption,
      });
      return response.data;
    } catch (error) {
      console.error('[WAHA Client] Error sending image:', error);
      throw error;
    }
  }

  /**
   * Get messages from a chat
   * WAHA endpoint: GET /api/{session}/chats/{chatId}/messages
   */
  async getMessages(chatId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/api/${this.sessionName}/chats/${encodeURIComponent(chatId)}/messages`,
        {
          params: {
            sortBy: 'messageTimestamp',
            downloadMedia: false,
            limit,
            'filter.fromMe': false
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[WAHA Client] Error getting messages:', error.message);
      throw error;
    }
  }

  /**
   * Download media from a message
   * WAHA endpoint: /api/files/{messageId}
   */
  async downloadMedia(messageId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      // WAHA Documentation: GET /api/files/{messageId}
      const response = await this.client.get(`/api/files/${messageId}`, {
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || 'application/octet-stream';

      return { buffer, mimeType };
    } catch (error: any) {
      console.error('[WAHA Client] Error downloading media:', error.message);
      throw error;
    }
  }

  /**
   * Download media from a reply message using the new URL format
   * WAHA endpoint: /api/files/{session}/{replyId}.{extension}
   * @param replyId The message ID from replyTo.id
   * @param mimetype The mimetype (e.g., 'application/pdf', 'image/jpeg')
   */
  async downloadMediaByReplyId(replyId: string, mimetype: string): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      // Map mimetype to file extension
      const mimetypeToExt: { [key: string]: string } = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc',
        'image/jpeg': 'jpeg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg'
      };

      const extension = mimetypeToExt[mimetype] || mimetype.split('/')[1] || 'bin';
      const url = `/api/files/${this.sessionName}/${replyId}.${extension}`;
      
      console.log(`[WAHA Client] Downloading media from: ${url}`);
      
      const response = await this.client.get(url, {
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || mimetype;

      return { buffer, mimeType };
    } catch (error: any) {
      console.error('[WAHA Client] Error downloading media by reply ID:', error.message);
      throw error;
    }
  }

  /**
   * Get all contacts
   * WAHA endpoint: GET /api/contacts/all
   */
  async getContacts(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/contacts/all', {
        params: { session: this.sessionName }
      });
      return response.data;
    } catch (error: any) {
      console.error('[WAHA Client] Error getting contacts:', error.message);
      return [];
    }
  }

  /**
   * Get group participants
   * WAHA endpoint: GET /api/{session}/groups/{groupId}/participants
   */
  async getGroupParticipants(groupId: string): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/api/${this.sessionName}/groups/${encodeURIComponent(groupId)}/participants`
      );
      return response.data;
    } catch (error: any) {
      console.error('[WAHA Client] Error getting group participants:', error.message);
      return [];
    }
  }
}
