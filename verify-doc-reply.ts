import { AIOrchestrator } from './lib/ai/orchestrator';
import { WAHAClient } from './lib/waha-client';
import { MediaParserService } from './lib/media-parser-service';
import * as fs from 'fs';
import * as path from 'path';

// Mock WAHAClient
class MockWAHA {
    async startTyping() {}
    async stopTyping() {}
    async sendSeen() {}
    async sendText(chatId: string, text: string) {
        console.log(`[MOCK WAHA] Sent to ${chatId}: ${text.substring(0, 100)}...`);
    }
    async downloadMedia(msgId: string) {
        const pdfPath = path.join(process.cwd(), 'downloaded_test.pdf');
        return {
            buffer: fs.readFileSync(pdfPath),
            mimeType: 'application/pdf'
        };
    }
}

async function verifyDocumentReply() {
    console.log('=== Verifying Document Reply Logic ===');
    
    const mockWaha = new MockWAHA() as any;
    const orchestrator = new AIOrchestrator();
    const parser = new MediaParserService();

    // 1. Simulate the text extraction part from the webhook
    const pdfPath = path.join(process.cwd(), 'downloaded_test.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const extractedText = await parser.extractTextFromPDF(pdfBuffer);
    
    console.log(`Extracted Text Length: ${extractedText.length}`);

    // 2. Simulate the message that "arrives" at the orchestrator level
    const userMessage = "Buatkan google from dari dokumen ini";
    const filenames = "lampiran - NIM 07513241020.pdf";
    const combinedMessage = `${userMessage}\n\n[TEKS DARI FILE YANG DIBALAS (Filename: ${filenames})]:\n${extractedText}`;

    console.log('--- Combined Message for AI ---');
    console.log(combinedMessage.substring(0, 300) + '...');
    
    const context = {
        phoneNumber: '66580767604826@lid',
        sessionState: {}
    };

    console.log('\n--- Sending to Orchestrator ---');
    // Note: In real life, biznet is called. We'll see the intent detection and tool execution.
    try {
        const reply = await orchestrator.handleMessage(combinedMessage, context);
        console.log('\n--- AI REPLY ---');
        console.log(reply);
        console.log('----------------');
    } catch (error: any) {
        console.error('Error during verification:', error.message);
    }
}

verifyDocumentReply();
