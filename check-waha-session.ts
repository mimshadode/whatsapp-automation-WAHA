import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSessionStatus() {
    const url = process.env.WAHA_API_URL || 'https://waha-production-5617.up.railway.app';
    const apiKey = process.env.WAHA_API_KEY || '6e191a93c6b148d6be23ee6875bb2aef';
    const session = 'default';

    console.log(`Checking WAHA Session Status: ${session} at ${url}`);
    
    try {
        // 1. List all sessions
        const sessions = await axios.get(`${url}/api/sessions`, {
            headers: { 'X-Api-Key': apiKey }
        });
        console.log('\n--- All Active Sessions ---');
        console.log(JSON.stringify(sessions.data, null, 2));

        if (sessions.data.length > 0) {
            const firstSession = sessions.data[0].name;
            console.log(`\nTesting with session: ${firstSession}`);
            
            // Try different endpoints for session info
            const me = await axios.get(`${url}/api/${firstSession}/me`, {
                headers: { 'X-Api-Key': apiKey }
            }).catch(e => ({ data: { error: e.message, status: e.response?.status } }));
            
            console.log(`\n--- Session ${firstSession} "Me" Info ---`);
            console.log(JSON.stringify(me.data, null, 2));
        }

    } catch (error: any) {
        console.error('❌ Error checking session:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

checkSessionStatus();
