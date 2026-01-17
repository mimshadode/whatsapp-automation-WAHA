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
    const message = payload.body || ''; 
    
    console.log(`[Webhook] INCOMING -> from: ${chatId}, body: "${message}"`); // Log immediately for debug
    
    if (!chatId) {
        console.error('[Webhook] Error: payload.from is missing/undefined');
        return NextResponse.json({ status: 'error', reason: 'missing_chat_id' }, { status: 400 });
    }

    // --- GROUP & MENTION LOGIC ---
    if (chatId.includes('@g.us')) {
        const envAllowed = process.env.ALLOWED_GROUPS || '';
        // Filter out empty strings to avoid [""] when env is empty
        const allowedGroups = envAllowed.split(',').map(g => g.trim()).filter(g => g.length > 0);
        const botNumber = process.env.BOT_PHONE_NUMBER;

        console.log(`[Webhook] Group Check: ID=${chatId}. Allowed=${JSON.stringify(allowedGroups)}. BotNum=${botNumber}`);

        // 1. Check if group is allowed (Whitelist)
        // Only enforce if allowedGroups has items
        if (allowedGroups.length > 0 && !allowedGroups.includes(chatId)) {
            console.log(`[Webhook] Ignored group ${chatId} (not in allowed list)`);
            return NextResponse.json({ status: 'ignored', reason: 'group_not_allowed' });
        }

        // 2. Check if Bot is Mentioned
        // WAHA payloads typically have mentionedIds in payload.mentionedIds or payload._data.mentionedIds
        const mentionedIds: string[] = payload.mentionedIds || (payload._data && payload._data.mentionedIds) || [];
        const botId = botNumber + '@s.whatsapp.net';
        
        // Debug mentions
        console.log(`[Webhook] Mentions: ${JSON.stringify(mentionedIds)}. Looking for: ${botId}`);

        let isMentioned = mentionedIds.includes(botId);

        // Fallback: Check if message body contains @BotNumber OR @Alias
        // This handles cases where metadata is missing or user tags by Contact Name
        if (!isMentioned) {
             const aliases = (process.env.BOT_MENTION_NAMES || '').split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0);
             const lowerMsg = message.toLowerCase();
             
             // Check @BotNumber
             const botLid = process.env.BOT_LID;
             if (message.includes('@' + botNumber) || (botLid && message.includes('@' + botLid))) {
                 console.log(`[Webhook] Fallback: Mention found via Phone Number or LID.`);
                 isMentioned = true;
             } 
             // Check Aliases
             else {
                 for (const alias of aliases) {
                     if (lowerMsg.includes('@' + alias)) {
                         console.log(`[Webhook] Fallback: Mention found via Alias '@${alias}'.`);
                         isMentioned = true;
                         break;
                     }
                 }
             }
        }

        if (!isMentioned) {
             console.log(`[Webhook] Ignored group ${chatId} (bot not mentioned)`);
             return NextResponse.json({ status: 'ignored', reason: 'not_mentioned' });
        }

        console.log(`[Webhook] Group Message Accepted: Mentioned in allowed group.`);
    }
    
    // Ensure message is a string
    // const message = payload.body || ''; // Moved up
    
    // console.log(`[Webhook] INCOMING -> from: ${chatId}, body: ${message}`); // Moved to top

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

    // Determine mentions for reply
    const mentions: string[] = [];
    if (chatId.includes('@g.us')) {
        // In groups, mention the sender
        // Payload 'participant' is the sender in a group
        const sender = payload.participant || payload._data?.participant;
        if (sender) {
            mentions.push(sender);
        }
    }

    console.log(`[Webhook] Sending response via WAHA to ${chatId}... (Mentions: ${mentions.join(', ')})`);
    await waha.sendText(chatId, reply, mentions);
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
