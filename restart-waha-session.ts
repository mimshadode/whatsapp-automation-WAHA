import axios from 'axios';

const WAHA_API_URL = process.env.WAHA_API_URL || 'http://localhost:5000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '0f1989b27ec64181b10f1af89376fd91';
const SESSION_NAME = 'default';

const client = axios.create({
  baseURL: WAHA_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': WAHA_API_KEY,
  },
});

async function restartSession() {
  try {
    console.log('🔄 Restarting WAHA session with NOWEB store configuration...\n');
    
    // Step 1: Stop the existing session
    console.log('1️⃣ Stopping existing session...');
    try {
      await client.post(`/api/sessions/${SESSION_NAME}/stop`);
      console.log('   ✅ Session stopped');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('   ℹ️  Session not found, skipping stop');
      } else {
        console.log('   ⚠️  Error stopping session:', error.message);
      }
    }

    // Step 2: Delete the existing session
    console.log('\n2️⃣ Deleting existing session...');
    try {
      await client.delete(`/api/sessions/${SESSION_NAME}`);
      console.log('   ✅ Session deleted');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('   ℹ️  Session not found, skipping delete');
      } else {
        console.log('   ⚠️  Error deleting session:', error.message);
      }
    }

    // Step 3: Create new session with NOWEB store configuration
    console.log('\n3️⃣ Creating new session with NOWEB store configuration...');
    const sessionConfig = {
      name: SESSION_NAME,
      config: {
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

    // Step 4: Start the session
    console.log('\n4️⃣ Starting session...');
    const startResponse = await client.post(`/api/sessions/${SESSION_NAME}/start`);
    console.log('   ✅ Session started!');
    console.log('   📄 Response:', JSON.stringify(startResponse.data, null, 2));

    console.log('\n✨ Session restart complete!');
    console.log('\n📱 Next steps:');
    console.log('   1. Open your WAHA dashboard or check the logs for the QR code');
    console.log('   2. Scan the QR code with your WhatsApp mobile app');
    console.log('   3. Wait for the session to connect');
    console.log('   4. Send a test message to your bot');

  } catch (error: any) {
    console.error('\n❌ Error restarting session:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
restartSession();
