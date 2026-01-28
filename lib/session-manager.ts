import db from './db';
import redis from './redis';
import { WhatsappSession } from '@prisma/client';

export class SessionManager {
  async getSession(phoneNumber: string): Promise<WhatsappSession | null> {
    try {
      // 1. Try Cache
      const cached = await redis.get(`session:${phoneNumber}`);
      if (cached) {
          // Refresh TTL on read? Maybe.
          return JSON.parse(cached);
      }

      // 2. Try DB
      const session = await db.whatsappSession.findUnique({
        where: { phoneNumber },
      });

      if (session) {
        await this.cacheSession(phoneNumber, session);
      }
      
      return session;
    } catch (error) {
       console.error('[Session Manager] Error getting session:', error);
       return null;
    }
  }

  async createSession(phoneNumber: string): Promise<WhatsappSession> {
      // Use upsert to handle race conditions where multiple webhooks might try to create a session simultaneously
      const session = await db.whatsappSession.upsert({
          where: { phoneNumber },
          update: {}, // No updates needed if it exists
          create: { 
              phoneNumber, 
              sessionState: {} 
          }
      });
      await this.cacheSession(phoneNumber, session);
      return session;
  }

  async updateSessionState(phoneNumber: string, newState: any) {
    // Fetch current session to get existing state
    const currentSession = await this.getSession(phoneNumber);
    const existingState = (currentSession?.sessionState || {}) as any;
    
    // Merge new state with existing state (deep merge for arrays like createdForms)
    const mergedState = { 
      ...existingState, 
      ...newState,
      // Special handling for array merging (like createdForms)
      ...(newState.createdForms && existingState.createdForms ? {
        createdForms: [...existingState.createdForms, ...newState.createdForms]
      } : {})
    };
    
    // console.log(`[SessionManager] Merging state for ${phoneNumber}`);
    
    // Update DB
    const session = await db.whatsappSession.upsert({
      where: { phoneNumber },
      update: { 
          sessionState: mergedState,
          lastActivity: new Date()
      },
      create: {
          phoneNumber,
          sessionState: mergedState
      }
    });

    // Update Cache
    await this.cacheSession(phoneNumber, session);
    return session;
  }
  
  async clearSession(phoneNumber: string) {
       await redis.del(`session:${phoneNumber}`);
       await db.whatsappSession.update({
           where: { phoneNumber },
           data: { sessionState: {} }
       });
  }

  async saveMessage(phoneNumber: string, role: 'user' | 'assistant', content: string) {
    const session = await this.getSession(phoneNumber);
    if (!session) return;

    await db.conversation.create({
      data: {
        sessionId: session.id,
        messageType: role,
        messageContent: content || '',
      }
    });
  }

  private async cacheSession(phoneNumber: string, session: WhatsappSession) {
    await redis.setex(`session:${phoneNumber}`, 3600, JSON.stringify(session));
  }
}
