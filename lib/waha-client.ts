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
  async sendText(chatId: string, text: string) {
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
      const response = await this.client.post('/api/sendText', {
        session: this.sessionName,
        chatId,
        text,
        linkPreview: false // Disable link previews as requested
      });

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
}
