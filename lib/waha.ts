export async function sendWhatsappMessage(chatId: string, message: string) {
  const wahaUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.WAHA_API_KEY || '',
      },
      body: JSON.stringify({
        chatId: chatId,
        text: message,
        session: 'default', // Sesuaikan jika menggunakan session lain
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WAHA Error] Status: ${response.status}, Body: ${errorText}`);
        throw new Error(`Failed to send message to WAHA: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[WAHA Client] Error sending message:', error);
    throw error;
  }
}
