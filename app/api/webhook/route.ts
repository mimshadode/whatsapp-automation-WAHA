import { NextResponse } from 'next/server';
import { WAHAClient } from '@/lib/waha-client';
import { SessionManager } from '@/lib/session-manager';
import { AIOrchestrator } from '@/lib/ai/orchestrator';

export const dynamic = 'force-dynamic';

// Initialize Services
const waha = new WAHAClient();
const sessionManager = new SessionManager();
const orchestrator = new AIOrchestrator();

// Lazy-loaded MediaParser to avoid server-side initialization issues
let mediaParser: any = null;
async function getMediaParser() {
  if (!mediaParser) {
    const { MediaParserService } = await import('@/lib/media-parser-service');
    mediaParser = new MediaParserService();
  }
  return mediaParser;
}
export async function POST(req: Request) {
  console.log('[Webhook] POST request received');
  console.log('[Webhook] DB URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
  console.log('[Webhook] REDIS URL:', process.env.REDIS_URL);
  
  try {
    const body = await req.json();
    const wahaSession = body.session || 'default';
    // Debugging: Log full payload to understand NOWEB structure
    console.log('[Webhook] Full Body:', JSON.stringify(body, null, 2));

    // Filter events: Only process 'message' events
    if (body.event && body.event !== 'message') {
        console.log(`[Webhook] Ignoring event: ${body.event}`);
        return NextResponse.json({ status: 'ignored', reason: 'non_message_event' });
    }

    const payload = body.payload;

    if (!payload) {
        console.log('[Webhook] No payload found in body');
        return NextResponse.json({ status: 'ignored', reason: 'no_payload' });
    }

    if (payload.fromMe || payload.from === 'status@broadcast') {
        // console.log(`[Webhook] Request ignored (fromMe or status)`);
        return NextResponse.json({ status: 'ignored' });
    }

    let chatId = payload.from;

    // Fix: Prefer s.whatsapp.net (canonical user ID) over @lid (linked device ID)
    // Sending to @lid sometimes causes delivery issues or only delivers to that specific device
    if (chatId.endsWith('@lid') && payload._data?.key?.remoteJidAlt) {
        console.log(`[Webhook] Switching chatId from LID (${chatId}) to Canonical (${payload._data.key.remoteJidAlt})`);
        chatId = payload._data.key.remoteJidAlt;
    }
    
    // --- WHITELIST FILTER FOR PRIVATE CHATS ---
    // Only apply whitelist to private chats (not groups)
    const isGroupChat = chatId.endsWith('@g.us');
    if (!isGroupChat) {
        const allowedUsers = process.env.ALLOWED_USERS?.split(',').map(u => u.trim()).filter(Boolean) || [];
        if (allowedUsers.length > 0 && !allowedUsers.includes(chatId)) {
            console.log(`[Webhook] Private chat from unauthorized user: ${chatId}`);
            return NextResponse.json({ status: 'ignored', reason: 'unauthorized_user' });
        }
    }
    
    let message = payload.body || ''; 
    const messageId = payload.id;


    // --- MEDIA HANDLING (NEW) ---
    // WAHA NOWEB may have different media detection
    const messageType = payload.type || (payload._data && payload._data.type);
    const mediaTypes = ['image', 'document', 'audio', 'video', 'sticker'];
    const isMediaType = mediaTypes.includes(messageType);
    const hasMedia = payload.hasMedia || 
                     (payload._data && payload._data.hasMedia) || 
                     isMediaType ||
                     (payload._data && payload._data.message && (
                       payload._data.message.documentMessage ||
                       payload._data.message.imageMessage ||
                       payload._data.message.audioMessage ||
                       payload._data.message.videoMessage
                     ));
    
    console.log(`[Webhook] DEBUG: type=${messageType}, hasMedia=${hasMedia}, isMediaType=${isMediaType}`);
    
    if (hasMedia && messageId) {
        try {
            console.log(`[Webhook] Media detected in message ${messageId}. Extracting...`);
            
            // Try to get media URL from payload first (WAHA provides this in payload.media.url)
            // The webhook structure is: { event, session, payload: { hasMedia, media: { url, mimetype } } }
            const mediaUrl = payload.media?.url || 
                             payload.payload?.media?.url ||
                             payload._data?.media?.url;
            
            const mediaMimetype = payload.media?.mimetype ||
                                  payload.payload?.media?.mimetype ||
                                  payload._data?.media?.mimetype;
            
            console.log(`[Webhook] DEBUG: mediaUrl=${mediaUrl || 'NOT_FOUND'}, mimetype=${mediaMimetype || 'unknown'}`);
            console.log(`[Webhook] DEBUG: payload.media=${JSON.stringify(payload.media || 'undefined')}`);

            
            let buffer: Buffer;
            let mimeType: string;
            
            if (mediaUrl) {
                // Replace localhost:3000 with actual WAHA_API_URL (Docker network issue)
                const wahaApiUrl = process.env.WAHA_API_URL || 'http://localhost:5000';
                const fixedMediaUrl = mediaUrl.replace('http://localhost:3000', wahaApiUrl);
                console.log(`[Webhook] DEBUG: fixedMediaUrl=${fixedMediaUrl}`);
                
                // Download directly from URL provided by WAHA
                const axios = (await import('axios')).default;
                const response = await axios.get(fixedMediaUrl, { 
                    responseType: 'arraybuffer',
                    headers: {
                        'X-Api-Key': process.env.WAHA_API_KEY || ''
                    }
                });
                buffer = Buffer.from(response.data);
                mimeType = response.headers['content-type'] || mediaMimetype || 'application/octet-stream';
            } else {
                // Fallback to WAHA client method
                const result = await waha.downloadMedia(messageId);
                buffer = result.buffer;
                mimeType = result.mimeType;
            }
            
            const parser = await getMediaParser();
            const extractedText = await parser.parseMedia(buffer, mimeType);
            
            const mediaFilename = payload.media?.filename || 
                                  payload.payload?.media?.filename || 
                                  payload._data?.media?.filename || 
                                  'Dokumen';

            if (extractedText && extractedText.trim().length > 0) {
                console.log(`[Webhook] Extracted text: ${extractedText.substring(0, 50)}...`);
                // Append extracted text to the message
                const prefix = message ? `${message}\n\n` : '';
                message = `${prefix}[TEKS DARI MEDIA (Filename: ${mediaFilename})]:\n${extractedText}`;
            }
        } catch (mediaError: any) {
            console.error('[Webhook] Media Extraction Error:', mediaError.message);
            // Non-blocking: continue with original message if extraction fails
        }
    }

    // --- REPLY TO MEDIA HANDLING (NEW) ---
    // Check for quoted message in various WAHA payload locations
    const replyTo = payload.replyTo || (payload._data && payload._data.replyTo);
    const quotedMsg = payload.quotedMsg || 
                      (payload._data && payload._data.quotedMsg) ||
                      replyTo;
    
    // For NOWEB, quoted message ID might be in quotedStanzaID or replyTo.id
    const quotedMsgId = quotedMsg?.id || 
                        (quotedMsg?._data?.id) || 
                        (payload._data?.quotedStanzaID) ||
                        replyTo?.id;
    
    if (quotedMsgId && !hasMedia) {
        const quotedHasMedia = quotedMsg?.hasMedia || 
                               (quotedMsg?._data?.hasMedia) ||
                               (quotedMsg?.type === 'document' || quotedMsg?.type === 'image') ||
                               (replyTo?._data?.documentMessage || replyTo?._data?.imageMessage);
        
        console.log(`[Webhook] DEBUG: quotedMsgId=${quotedMsgId}, quotedHasMedia=${quotedHasMedia}`);
        
        if (quotedHasMedia) {
            try {
                console.log(`[Webhook] User is replying to a message with media (ID: ${quotedMsgId}). Extracting...`);
                
                // Extract mimetype from the reply message structure
                const quotedMime = quotedMsg?.mimetype || 
                                   quotedMsg?._data?.mimetype || 
                                   (replyTo?._data?.documentMessage?.mimetype) ||
                                   (replyTo?._data?.imageMessage?.mimetype) ||
                                   'application/octet-stream';
                
                console.log(`[Webhook] DEBUG: quotedMime=${quotedMime}`);

                let buffer: Buffer;
                let mimeType: string;

                // Try the new URL format first (replyTo.id + mimetype)
                try {
                    console.log(`[Webhook] Trying new URL format: /api/files/${process.env.WAHA_SESSION || 'default'}/${quotedMsgId}.{ext}`);
                    const result = await waha.downloadMediaByReplyId(quotedMsgId, quotedMime);
                    buffer = result.buffer;
                    mimeType = result.mimeType;
                    console.log(`[Webhook] Successfully downloaded using new URL format`);
                } catch (newFormatError: any) {
                    console.log(`[Webhook] New URL format failed: ${newFormatError.message}. Trying fallback...`);
                    
                    // Fallback to old method
                    const result = await waha.downloadMedia(quotedMsgId);
                    buffer = result.buffer;
                    mimeType = result.mimeType;
                }

                const parser = await getMediaParser();
                const extractedText = await parser.parseMedia(buffer, mimeType);
                
                // Get filename if possible
                const quotedFilename = quotedMsg?.filename || 
                                       quotedMsg?.media?.filename ||
                                       (replyTo?._data?.documentMessage?.fileName) ||
                                       'Dokumen';

                if (extractedText && extractedText.trim().length > 0) {
                    console.log(`[Webhook] Extracted text from quoted message: ${extractedText.substring(0, 50)}...`);
                    const prefix = message ? `${message}\n\n` : '';
                    message = `${prefix}[TEKS DARI FILE YANG DIBALAS (Filename: ${quotedFilename})]:\n${extractedText}`;
                }
            } catch (quotedMediaError: any) {
                console.error('[Webhook] Quoted Media Extraction Error:', quotedMediaError.message);
            }
        }
    }

    // --- REPLY TO TEXT HANDLING (NEW) ---
    // Extract the text content of the message being replied to (non-media case)
    let replyContext = '';
    if (quotedMsg && !hasMedia) {
        const quotedBody = quotedMsg.body || 
                           quotedMsg?.text ||
                           (quotedMsg._data && quotedMsg._data.body) ||
                           (quotedMsg._data && quotedMsg._data.text) ||
                           '';
        
        if (quotedBody && quotedBody.trim().length > 0) {
            replyContext = quotedBody.trim();
            console.log(`[Webhook] Reply context extracted: "${replyContext.substring(0, 50)}..."`);
        }
    }
    
    console.log(`[Webhook] INCOMING -> from: ${chatId}, body: "${message}"`); // Log immediately for debug
    
    if (!chatId) {
        console.error('[Webhook] Error: payload.from is missing/undefined');
        return NextResponse.json({ status: 'error', reason: 'missing_chat_id' }, { status: 400 });
    }

    // Session Management (Database + Cache) - MOVED UP to support dynamic aliases
    console.log(`[Webhook] Fetching session for ${chatId}...`);
    let session = await sessionManager.getSession(chatId);
    
    if (!session) {
        console.log(`[Webhook] Session NOT FOUND. Creating...`);
        session = await sessionManager.createSession(chatId);
        console.log(`[Webhook] New session created: ${session.id}`);
    } else {
        console.log(`[Webhook] Session found: ${session.id}`);
    }

    // --- GROUP & MENTION LOGIC ---
    if (chatId.includes('@g.us')) {
        const envAllowed = process.env.ALLOWED_GROUPS || '';
        const allowedGroups = envAllowed.split(',').map(g => g.trim()).filter(g => g.length > 0);
        const botNumber = process.env.BOT_PHONE_NUMBER;

        console.log(`[Webhook] Group Check: ID=${chatId}. Allowed=${JSON.stringify(allowedGroups)}. BotNum=${botNumber}`);

        // 1. Check if group is allowed (Whitelist)
        if (allowedGroups.length > 0 && !allowedGroups.includes(chatId)) {
            console.log(`[Webhook] Ignored group ${chatId} (not in allowed list)`);
            return NextResponse.json({ status: 'ignored', reason: 'group_not_allowed' });
        }

        // 2. Check if Bot is Mentioned
        const mentionedIds: string[] = payload.mentionedIds || (payload._data && payload._data.mentionedIds) || [];
        const botId = botNumber + '@s.whatsapp.net';
        const botLid = process.env.BOT_LID ? process.env.BOT_LID + '@lid' : ''; // Expecting BOT_LID to be just the number part in env
        
        console.log(`[Webhook] Mentions check: looking for ${botId} ${botLid ? 'or ' + botLid : ''} in ${JSON.stringify(mentionedIds)}`);

        let isMentioned = mentionedIds.includes(botId);
        
        // Also check LID if available (Linked Device ID)
        if (!isMentioned && botLid && mentionedIds.includes(botLid)) {
             console.log(`[Webhook] Bot mentioned via LID: ${botLid}`);
             isMentioned = true;
        }

        // Fallback: Check if message body contains @BotNumber OR @Alias
        if (!isMentioned) {
             // Combine static env aliases with dynamic session alias
             const envAliases = (process.env.BOT_MENTION_NAMES || '').split(',').map(n => n.trim()).filter(n => n.length > 0);
             
             // Extract dynamic alias from session state
             const sessionData = session.sessionState as any;
             const dynamicAlias = sessionData?.metadata?.botName; 
             
             let aliases = [...envAliases];
             if (dynamicAlias) {
                 aliases.push(dynamicAlias); // Add "asis", "Clara", etc.
                 console.log(`[Webhook] Added dynamic alias from session: ${dynamicAlias}`);
             }

             const lowerMsg = message.toLowerCase();
             
             // Check @BotNumber
             const botLid = process.env.BOT_LID;
             if (message.includes(botNumber) || (botLid && message.includes('@' + botLid))) {
                 console.log(`[Webhook] Fallback Mention: Found via Phone Number (${botNumber}) or LID.`);
                 isMentioned = true;
             } 
             // Check Aliases with Word Boundaries to avoid false positives (e.g. "keren" matching "ren")
             else {
                 for (const alias of aliases) {
                     // Escape special characters in alias and use word boundaries
                     const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                     const regex = new RegExp(`(^|\\s|@)${escapedAlias}(\\s|$|\\?|\\.|!|,|:|;)`, 'i');
                     
                     if (regex.test(message)) {
                         console.log(`[Webhook] Fallback Mention: Found via Alias '${alias}' (Regex Match).`);
                         isMentioned = true;
                         break;
                     }
                 }
             }
        }

        if (!isMentioned) {
             console.log(`[Webhook] Ignored group ${chatId}: Bot not mentioned. Msg: "${message.substring(0, 30)}..."`);
             return NextResponse.json({ status: 'ignored', reason: 'not_mentioned' });
        }

        console.log(`[Webhook] Group Message Accepted: ID=${chatId}, Mentioned=true`);
    }

    // --- CLEANUP MESSAGE FOR AI ---
    // Now that we've validated the bot is mentioned, strip the mention from the message
    // so the AI processes "halo" instead of "@628... halo"
    if (isGroupChat && message.startsWith('@')) {
        message = message.replace(/^@\d+\s*/, '').trim();
        console.log(`[Webhook] Stripped mention for AI processing. Clean body: "${message}"`);
    }

    // Save user message
    await sessionManager.saveMessage(chatId, 'user', message);


    // --- AI ORCHESTRATION ---
    // Extract messageId from payload (WAHA NOWEB uses 'id' for the message ID)
    // const messageId = payload.id; // Already extracted above

    console.log(`[Webhook] Dispatching to AI Orchestrator... (MsgID: ${messageId || 'none'})`);
    let senderName = payload.pushname || payload.pushName || (payload._data && (payload._data.pushname || payload._data.pushName)) || '';

    // If pushname is missing (common in some WAHA engines/group setups), try to resolve it from contacts
    if (!senderName) {
        try {
            console.log('[Webhook] Pushname missing, attempting to resolve from contacts...');
            const contacts = await waha.getContacts();
            // Participant is the sender in a group, otherwise use 'from'
            const senderId = payload.participant || payload._data?.participant || payload.from;
            
            if (senderId) {
                const contact = contacts.find(c => c.id === senderId);
                if (contact) {
                    senderName = contact.pushname || contact.pushName || '';
                    if (senderName) {
                        console.log(`[Webhook] Resolved pushname: ${senderName} for ID: ${senderId}`);
                    }
                }
            }
        } catch (error) {
            console.error('[Webhook] Error resolving pushname:', error);
        }
    }

    const response = await orchestrator.handleMessage(message, {
        phoneNumber: chatId,
        sessionState: session.sessionState,
        messageId: messageId,
        senderName: senderName,
        replyContext: replyContext // Pass the quoted message text
    });

    const replyText = response.reply;
    console.log(`[Webhook] AI Replied: ${replyText.substring(0, 50)}...`);

    // --- PERSISTENCE HANDLING ---
    // Always save lastBotResponse for follow-up context
    const contextState = {
      ...(response.newState || {}),
      lastBotResponse: replyText.substring(0, 500) // Limit to 500 chars to save space
    };
    
    console.log(`[Webhook] Persisting session state for ${chatId}`);
    await sessionManager.updateSessionState(chatId, contextState);
    
    // Save assistant message
    await sessionManager.saveMessage(chatId, 'assistant', replyText);

    const mentions: string[] = [];
    if (chatId.includes('@g.us')) {
        // In groups, mention the sender
        // Payload 'participant' is the sender in a group
        const sender = payload.participant || payload._data?.participant;
        if (sender) {
            mentions.push(sender);
        }
    }

    // --- QR CODE HANDLING (TEXT FALLBACK FOR NON-PLUS WAHA) ---
    let finalReplyText = replyText;
    if (response.newState?.lastFormQrUrl) {
        finalReplyText += `\n\n🖼️ *QR Code Link:* \n${response.newState.lastFormQrUrl}`;
    }

    console.log(`[Webhook] Sending response via WAHA to ${chatId}... (MsgID: ${messageId})`);
    await waha.sendText(chatId, finalReplyText, messageId, mentions);
    
    console.log(`[Webhook] Response process completed.`);


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
