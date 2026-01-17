import { NextResponse } from 'next/server';
import { WAHAClient } from '@/lib/waha-client';
import { SessionManager } from '@/lib/session-manager';
import { AIOrchestrator } from '@/lib/ai/orchestrator';

export const dynamic = 'force-dynamic';

// Initialize Services
const waha = new WAHAClient();
const sessionManager = new SessionManager();
const orchestrator = new AIOrchestrator(waha);
export async function POST(req: Request) {
  console.log('[Webhook] POST request received');
  console.log('[Webhook] DB URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
  console.log('[Webhook] REDIS URL:', process.env.REDIS_URL);
  
  try {
    const body = await req.json();
    // Debugging: Log full payload to understand NOWEB structure
    // console.log('[Webhook] Full Body:', JSON.stringify(body, null, 2));

    const payload = body.payload;

    if (!payload) {
        console.log('[Webhook] No payload found in body');
        return NextResponse.json({ status: 'ignored', reason: 'no_payload' });
    }

    if (payload.fromMe || payload.from === 'status@broadcast') {
        // console.log(`[Webhook] Request ignored (fromMe or status)`);
        return NextResponse.json({ status: 'ignored' });
    }

    const chatId = payload.from;
    
    if (!chatId) {
        console.error('[Webhook] Error: payload.from is missing/undefined');
        return NextResponse.json({ status: 'error', reason: 'missing_chat_id' }, { status: 400 });
    }

    // Ignore group messages (optional, depending on requirement, but usually safer for bots)
    if (chatId.includes('@g.us')) {
        console.log('[Webhook] Request ignored (group message)');
        return NextResponse.json({ status: 'ignored' });
    }
    
    // Ensure message is a string
    const message = payload.body || '';
    
    console.log(`[Webhook] INCOMING -> from: ${chatId}, body: ${message}`);

    // Session Management (Database + Cache)
    console.log(`[Webhook] Fetching session for ${chatId}...`);
    let session = await sessionManager.getSession(chatId);
    
    if (!session) {
        console.log(`[Webhook] Session NOT FOUND. Creating...`);
        session = await sessionManager.createSession(chatId);
        console.log(`[Webhook] New session created: ${session.id}`);
    } else {
        console.log(`[Webhook] Session found: ${session.id}`);
    }

    // Save user message
    await sessionManager.saveMessage(chatId, 'user', message);


    // --- AI ORCHESTRATION ---
    // Extract messageId from payload (WAHA NOWEB uses 'id' for the message ID)
    const messageId = payload.id;

    console.log(`[Webhook] Dispatching to AI Orchestrator... (MsgID: ${messageId || 'none'})`);
    const reply = await orchestrator.handleMessage(message, {
        phoneNumber: chatId,
        sessionState: session.sessionState,
        messageId: messageId
    });

    console.log(`[Webhook] AI Replied: ${reply.substring(0, 50)}...`);
    
    // Save assistant message
    await sessionManager.saveMessage(chatId, 'assistant', reply);

    console.log(`[Webhook] Sending response via WAHA to ${chatId}...`);
    await waha.sendText(chatId, reply);
    console.log(`[Webhook] Response sent successfully.`);


    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('[Webhook] Internal Error:', error);
    return NextResponse.json({ 
        status: 'error', 
        message: error.message,
        stack: error.stack
    }, { status: 500 });
  }
}
