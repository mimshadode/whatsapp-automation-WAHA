import dotenv from 'dotenv';
import { WAHAClient } from './lib/waha-client';

// Load .env.local file
dotenv.config({ path: '.env.local' });

async function testGetMessages() {
  console.log('=== Testing WAHAClient.getMessages ===\n');
  
  const waha = new WAHAClient();
  
  // Use the chat ID from the user's example
  const chatId = '66580767604826@lid';
  
  try {
    console.log(`Fetching messages from chat: ${chatId}`);
    const messages = await waha.getMessages(chatId, 10);
    
    console.log(`\nSuccessfully fetched ${messages.length} messages`);
    console.log('\nFirst message:');
    console.log(JSON.stringify(messages[0], null, 2));
    
    // Check for messages with replyTo
    const messagesWithReply = messages.filter((msg: any) => msg.replyTo);
    console.log(`\nMessages with replies: ${messagesWithReply.length}`);
    
    if (messagesWithReply.length > 0) {
      console.log('\nFirst message with reply:');
      console.log(JSON.stringify(messagesWithReply[0], null, 2));
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGetMessages();
