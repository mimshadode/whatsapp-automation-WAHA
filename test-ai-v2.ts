import { GeneralQATool } from './lib/ai/tools/general-qa-tool';
import { BotIntent, ToolContext } from './lib/ai/types';
import dotenv from 'dotenv';
import { AIOrchestrator } from './lib/ai/orchestrator';

// Load environment variables
dotenv.config();

/**
 * Test Fully AI Native Responses
 */
async function testAINativeV2() {
  console.log('🧪 Testing Full AI Native Bot (V2)\n');

  // We test the Orchestrator routing mostly, but mocking is hard.
  // Instead, let's test GeneralQATool directly with "Greeting" and "Thanks" messages 
  // to simulate what happens after routing.

  const tool = new GeneralQATool();
  const context: ToolContext = {
    phoneNumber: '6282134832132@s.whatsapp.net',
    senderName: 'Test User',
    sessionState: {
      conversationHistory: [] // Empty history
    }
  };

  const scenarios = [
    {
      type: "Greeting (First Time)",
      msg: "Malam jon"
    },
    {
      type: "Greeting (Repeat)",
      msg: "Malam lagi"
    },
    {
      type: "Acknowledgment",
      msg: "Makasih ya"
    },
    {
      type: "Request Example",
      msg: "Saya mau contoh pesan buat form dong"
    },
    {
      type: "Follow-up Agreement (Contextual)",
      msg: "Oke buatkan"
    },
    {
      type: "General Topic (Creative)",
      msg: "Buatkan pantun tentang koding yang error"
    },
    {
      type: "Developer Identity",
      msg: "Siapa yang menciptakanmu?"
    },
    {
      type: "Developer Identity (Specific)",
      msg: "Siapa itu La Ode Mimshad?"
    },
    {
      type: "General QA (Tips)",
      msg: "Tuliskan tips untuk membuat google form"
    },
    {
      type: "Language: English",
      msg: "Hello! Can you help me create a registration form?"
    },
    {
      type: "Language: Javanese",
      msg: "Sugeng enjing, aku pengen nggawe form pendaftaran"
    },
    {
      type: "Intent Fix: Example Phrase (NOT create form)",
      msg: "Contoh kata-kata untuk membuat google form"
    },
    {
      type: "Self-Intro (English) - Should be SHORT",
      msg: "Explain yourself, what you can do, how to do it"
    }
  ];

  for (const s of scenarios) {
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`📡 Type: ${s.type}`);
    console.log(`👤 User: ${s.msg}`);
    
    try {
      // Simulate Orchestrator passing intent to GeneralQATool
      // Context history grows
      const response = await tool.execute(s.msg, context);
      
      console.log(`🤖 Bot : ${response.reply}`);
      
      // Update context
      if (response.newState?.conversationHistory) {
         context.sessionState.conversationHistory = response.newState.conversationHistory;
      }
      
    } catch (e) {
      console.error(e);
    }
    
    // Short pause
    await new Promise(r => setTimeout(r, 1000));
  }
}

testAINativeV2();
