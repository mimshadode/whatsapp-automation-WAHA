import db from './db';
import redis from './redis';
import { WhatsappSession } from '@prisma/client';

export class SessionManager {
  async getSession(phoneNumber: string): Promise<WhatsappSession | null> {
    try {
      // 1. Try Cache
      const cached = await redis.get(`session:${phoneNumber}`);
      if (cached) {
          if (cached.length > 2000000) { // 2MB safety
              console.error(`[SessionManager] CRITICAL: Redis session for ${phoneNumber} is too large (${cached.length}). Clearing cache.`);
              await redis.del(`session:${phoneNumber}`);
              return null;
          }
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
    
    // Merge new state with existing state
    const mergedState = { 
      ...existingState, 
      ...newState
    };
    
    const mergedStateStr = JSON.stringify(mergedState);
    const MAX_STATE_SIZE = 1024 * 1024; // 1MB limit
    
    if (mergedStateStr.length > MAX_STATE_SIZE) {
        console.error(`[SessionManager] CRITICAL: Session state for ${phoneNumber} exceeded ${MAX_STATE_SIZE} chars (${mergedStateStr.length}). Resetting state to prevent crash.`);
        // Emergency reset to prevent OOM/RangeError
        await db.whatsappSession.update({
            where: { phoneNumber },
            data: { sessionState: {}, updatedAt: new Date() }
        });
        await redis.del(`session:${phoneNumber}`);
        return null;
    }
    
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
    const sessionStr = JSON.stringify(session);
    const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB
    if (sessionStr.length > MAX_CACHE_SIZE) {
        console.error(`[SessionManager] REJECTED: Session cache for ${phoneNumber} is too large (${sessionStr.length}). Not caching.`);
        return;
    }
    await redis.setex(`session:${phoneNumber}`, 3600, sessionStr);
  }
}
