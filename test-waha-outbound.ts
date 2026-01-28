import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testOutbound() {
    const url = process.env.WAHA_API_URL || 'https://waha-production-5617.up.railway.app';
    const apiKey = process.env.WAHA_API_KEY || '75b08331d7774ee5850f711f9b2c7206';
    const recipient = '6282134832132@s.whatsapp.net';
    const message = 'Halo! Ini tes koneksi bot dari sistem. Jika Anda menerima ini, berarti bot bisa mengirim pesan.';

    console.log(`Testing Outbound WAHA to: ${recipient}`);
    
    try {
        const response = await axios.post(`${url}/api/sendText`, {
            session: 'default',
            chatId: recipient,
            text: message
        }, {
            headers: { 
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Response:', response.data);
        console.log('Silakan cek WhatsApp Anda. Jika pesan ini masuk, berarti Bot sudah ONLINE dan nomornya BENAR.');
    } catch (error: any) {
        console.error('❌ Failed to send message:', error.message);
        if (error.response) {
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testOutbound();
