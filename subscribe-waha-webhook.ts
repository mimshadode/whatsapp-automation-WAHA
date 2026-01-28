import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function subscribeWebhook() {
    const url = process.env.WAHA_API_URL || 'https://waha-production-5617.up.railway.app';
    const apiKey = process.env.WAHA_API_KEY || '6e191a93c6b148d6be23ee6875bb2aef';
    const webhookUrl = 'https://whatsapp-automation-waha.vercel.app/api/webhook';

    console.log(`Subscribing WAHA to: ${webhookUrl}`);
    
    try {
        const response = await axios.post(`${url}/api/webhooks`, {
            url: webhookUrl,
            events: ['message'],
            hmac: null // Not using HMAC for now
        }, {
            headers: { 
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook Subscribed:', response.data);
    } catch (error: any) {
        console.error('❌ Failed to subscribe:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Try session-specific webhook endpoint
        try {
            console.log('--- Trying Session-Specific Method ---');
            const response = await axios.post(`${url}/api/sessions/default/webhooks`, {
                url: webhookUrl,
                events: ['message']
            }, {
                headers: { 
                    'X-Api-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Session Webhook Subscribed:', response.data);
        } catch (e: any) {
            console.error('❌ Session-Specific Failed:', e.response?.data || e.message);
        }
    }
}

subscribeWebhook();
