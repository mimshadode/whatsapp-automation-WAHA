import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const WAHA_API_URL = process.env.WAHA_API_URL || 'http://localhost:5000';
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const WEBHOOK_URL = process.env.WHATSAPP_HOOK_URL || 'http://host.docker.internal:3001/api/webhook';
const SESSION_NAME = 'default';

const client = axios.create({
  baseURL: WAHA_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': WAHA_API_KEY,
  },
});

async function createSessionWithWebhook() {
  try {
    console.log('🔧 Creating WAHA session with webhook configuration...\\n');
    console.log(`📍 WAHA URL: ${WAHA_API_URL}`);
    console.log(`🔗 Webhook URL: ${WEBHOOK_URL}\\n`);
    
    // Step 1: Check if session exists
    console.log('1️⃣ Checking existing session...');
    try {
      const existingSession = await client.get(`/api/sessions/${SESSION_NAME}`);
      console.log('   ℹ️  Session already exists');
      console.log('   📄 Current config:', JSON.stringify(existingSession.data.config, null, 2));
      
      // Check if webhook is already configured
      const webhooks = existingSession.data.config?.webhooks || [];
      if (webhooks.length > 0) {
        console.log('\\n   ✅ Webhook already configured!');
        console.log('   📄 Webhooks:', JSON.stringify(webhooks, null, 2));
        return;
      }
      
      console.log('\\n   ⚠️  No webhook configured. Deleting and recreating session...');
      
      // Stop and delete existing session
      try {
        await client.post(`/api/sessions/${SESSION_NAME}/stop`);
        console.log('   ✅ Session stopped');
      } catch (e) {
        console.log('   ℹ️  Session already stopped');
      }
      
      await client.delete(`/api/sessions/${SESSION_NAME}`);
      console.log('   ✅ Session deleted');
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('   ℹ️  No existing session found');
      } else {
        throw error;
      }
    }

    // Step 2: Create new session with webhook
    console.log('\\n2️⃣ Creating new session with webhook...');
    const sessionConfig = {
      name: SESSION_NAME,
      config: {
        webhooks: [
          {
            url: WEBHOOK_URL,
            events: ['message', 'session.status']
          }
        ],
        noweb: {
          store: {
            enabled: true,
            fullSync: true
          }
        }
      }
    };

    console.log('   📝 Configuration:', JSON.stringify(sessionConfig, null, 2));
    const response = await client.post('/api/sessions/', sessionConfig);
    console.log('   ✅ Session created successfully!');
    console.log('   📄 Response:', JSON.stringify(response.data, null, 2));

    // Step 3: Start the session
    console.log('\\n3️⃣ Starting session...');
    const startResponse = await client.post(`/api/sessions/${SESSION_NAME}/start`);
    console.log('   ✅ Session started!');
    console.log('   📄 Response:', JSON.stringify(startResponse.data, null, 2));

    console.log('\\n✨ Session created with webhook successfully!');
    console.log('\\n📱 Next steps:');
    console.log('   1. Check WAHA logs or dashboard for QR code');
    console.log('   2. Scan QR code with WhatsApp mobile app');
    console.log('   3. Wait for session to connect');
    console.log('   4. Send a test message to verify webhook is working');

  } catch (error: any) {
    console.error('\\n❌ Error creating session:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
createSessionWithWebhook();
