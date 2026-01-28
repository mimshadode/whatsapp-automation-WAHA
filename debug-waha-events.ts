import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkWahaEvents() {
    const url = process.env.WAHA_API_URL || 'https://waha-production-5617.up.railway.app';
    const apiKey = process.env.WAHA_API_KEY || '6e191a93c6b148d6be23ee6875bb2aef';
    const session = 'default';

    console.log(`Checking WAHA Events & Config at: ${url}`);
    
    try {
        // 1. Check if the session is subscribed to webhooks
        // In WAHA, webhooks are usually global, but let's check the config
        const config = await axios.get(`${url}/api/config`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log('--- WAHA Global Config ---');
        console.log(JSON.stringify(config.data, null, 2));

        // 2. Check the session specifically
        const sessionInfo = await axios.get(`${url}/api/sessions/${session}`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log('\n--- Session Info ---');
        console.log(JSON.stringify(sessionInfo.data, null, 2));

        // 3. Try to list active webhooks (if supported by this version)
        try {
            const webhooks = await axios.get(`${url}/api/webhooks`, {
                headers: { 'X-Api-Key': apiKey }
            });
            console.log('\n--- Active Webhooks ---');
            console.log(JSON.stringify(webhooks.data, null, 2));
        } catch (e) {
            console.log('\n--- Webhooks endpoint not available or returned error ---');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkWahaEvents();
