import { GeneralQATool } from './lib/ai/tools/general-qa-tool';
import { ToolContext } from './lib/ai/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test General QA Tool
 * Run this to verify the general question answering feature works
 */
async function testGeneralQA() {
  console.log('🧪 Testing General QA Tool\n');

  const tool = new GeneralQATool();

  // Test context
  const context: ToolContext = {
    phoneNumber: '6282134832132@s.whatsapp.net',
    senderName: 'Test User',
    sessionState: {}
  };

  // Test cases
  const testQuestions = [
    {
      category: 'General Knowledge',
      question: 'Apa itu Google Forms?'
    },
    {
      category: 'How-To',
      question: 'Gimana cara lihat hasil form?'
    },
    {
      category: 'Chitchat',
      question: 'Halo, apa kabar?'
    },
    {
      category: 'Feature Inquiry',
      question: 'Apa aja yang bisa kamu bantu?'
    },
    {
      category: 'Tips',
      question: 'Kasih tips dong cara bikin form yang menarik'
    }
  ];

  for (const { category, question } of testQuestions) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Category: ${category}`);
    console.log(`❓ Question: ${question}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const response = await tool.execute(question, context);

      if (response.success) {
        console.log('✅ Success!');
        console.log(`\n💬 Bot Reply:\n${response.reply}\n`);
        
        // Update context for next question (simulate conversation)
        if (response.newState) {
          context.sessionState = {
            ...context.sessionState,
            ...response.newState
          };
        }
      } else {
        console.log('❌ Failed!');
        console.log(`Error: ${response.reply}`);
      }
    } catch (error: any) {
      console.log(`❌ Exception: ${error.message}`);
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ Test Complete!');
  console.log(`${'='.repeat(60)}\n`);

  console.log('📊 Summary:');
  console.log(`   Total Questions: ${testQuestions.length}`);
  console.log(`   Conversation History: ${context.sessionState?.conversationHistory?.length || 0} exchanges\n`);
}

// Run test
testGeneralQA()
  .then(() => {
    console.log('✅ All tests completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
