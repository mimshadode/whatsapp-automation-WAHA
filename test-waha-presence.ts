import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const API_KEY = process.env.WAHA_API_KEY;
const API_URL = process.env.WAHA_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY,
  },
});

async function main() {
  console.log('--- WAHA API DIAGNOSTICS ---');
  console.log(`URL: ${API_URL}`);
  
  try {
    // 1. Check Sessions
    console.log('\n1. Checking Sessions...');
    const sessions = await client.get('/api/sessions');
    console.log('Sessions:', JSON.stringify(sessions.data, null, 2));

    const sessionName = 'default'; // Assuming 'default' based on code
    const chatId = '66580767604826@c.us'; // Using ID from previous logs, changing @lid to @c.us for standard testing if needed, or stick to what we saw.
    // Note: detailed logs showed "from: 66580767604826@lid". LID is for privacy. Let's try both or just look at what sessions says.

    /*
    // 2. Test Mark as Seen (Chat Specific - FAILED)
    console.log(`\n2. Testing Mark as Seen for session '${sessionName}' chat '${chatId}'...`);
    const seenUrl = `/api/${sessionName}/chats/${chatId}/messages/read`;
    console.log(`POST ${seenUrl}`);
    
    try {
        const response = await client.post(seenUrl, {});
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (err: any) {
       console.error('FAILED (Chat Specific):', err.message);
       if (err.response) console.error('Data:', JSON.stringify(err.response.data));
    }
    */

    // 3. Test Mark as Seen (Global Endpoint)
    console.log(`\n3. Testing Mark as Seen (Global /api/sendSeen)...`);
    const globalSeenUrl = `/api/sendSeen`;
    console.log(`POST ${globalSeenUrl}`);
    
    try {
        const response = await client.post(globalSeenUrl, {
            session: sessionName,
            chatId: chatId
        });
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error('FAILED (Global):', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    }

  } catch (error: any) {
    console.error('FATAL ERROR:', error.message);
    if (error.response) {
         console.error('Status:', error.response.status);
         console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
