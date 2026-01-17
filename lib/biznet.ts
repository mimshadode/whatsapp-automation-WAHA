import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.BIZNET_API_KEY,
  baseURL: process.env.BIZNET_BASE_URL,
});

const SYSTEM_PROMPT = `
You are a helpful assistant for creating Google Forms.
Your goal is to extract form details from user messages and return them in strict JSON format.

If the user asks to create a form, you MUST return a JSON object with this structure:
\`\`\`json
{
  "tool": "google_forms_creator",
  "parameters": {
    "title": "Form Title",
    "questions": [
       { "title": "Question 1", "type": "text|choice", "options": [] }
    ]
  }
}
\`\`\`

If the user sends a normal chat (e.g., "Hello", "How are you"), reply normally with text.
DO NOT return JSON for normal chats.
`;

export async function generateAIResponse(userMessage: string) {
  try {
    const response = await client.chat.completions.create({
      model: process.env.BIZNET_MODEL || 'gpt-oss-20b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3, // Rendah agar output konsisten/stabil
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('[Biznet AI] Error generating response:', error);
    return "Maaf, saya sedang mengalami gangguan. Coba lagi nanti.";
  }
}
