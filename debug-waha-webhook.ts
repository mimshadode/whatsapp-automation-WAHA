import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkWahaConfig() {
    const apiKey = process.env.WAHA_API_KEY || '75b08331d7774ee5850f711f9b2c7206';
    const testUrl = 'https://waha-production-5617.up.railway.app';
    const url = process.env.WAHA_API_URL || testUrl;

    console.log(`Checking WAHA at: ${url}`);
    
    try {
        // 1. Check Version/Status
        const status = await axios.get(`${url}/api/version`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log('✅ WAHA is Online. Version:', status.data.version);

        // 2. Check Sessions
        const sessions = await axios.get(`${url}/api/sessions`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log('✅ Active Sessions:', sessions.data.map((s: any) => `${s.name} (${s.status})`).join(', '));

        // 3. Check Webhook Config
        console.log('--- Current Webhooks ---');
        const webhooks = await axios.get(`${url}/api/webhooks`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log(JSON.stringify(webhooks.data, null, 2));

        const me = await axios.get(`${url}/api/default/me`, {
            headers: { 'X-Api-Key': apiKey }
        }).catch(() => ({ data: { wid: 'unknown' } }));
        
        console.log('✅ Bot Number:', me.data.wid);

    } catch (error: any) {
        console.error('❌ Error checking WAHA:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

checkWahaConfig();
