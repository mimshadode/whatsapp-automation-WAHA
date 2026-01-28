import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function restartSession() {
    const url = process.env.WAHA_API_URL || 'https://waha-production-5617.up.railway.app';
    const apiKey = process.env.WAHA_API_KEY || '6e191a93c6b148d6be23ee6875bb2aef';
    const session = 'default';

    console.log(`Force Restarting WAHA Session: ${session} at ${url}`);
    
    try {
        // 1. Stop if running
        console.log('Stopping session...');
        await axios.post(`${url}/api/sessions/${session}/stop`, {}, {
            headers: { 'X-Api-Key': apiKey }
        }).catch(e => console.log('Session was already stopped or not found.'));

        // Wait a bit
        await new Promise(r => setTimeout(r, 3000));

        // 2. Start session
        console.log('Starting session...');
        await axios.post(`${url}/api/sessions/${session}/start`, {}, {
            headers: { 'X-Api-Key': apiKey }
        });

        console.log('✅ Start command sent. Please check Dashboard to Scan QR if needed.');
        
        // 3. Monitor status
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const status = await axios.get(`${url}/api/sessions/${session}`, {
                headers: { 'X-Api-Key': apiKey }
            });
            console.log(`Session Status: ${status.data.status}`);
            if (status.data.status === 'WORKING') {
                console.log('🚀 Session is READY and WORKING!');
                break;
            }
        }

    } catch (error: any) {
        console.error('❌ Error restarting session:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

restartSession();
