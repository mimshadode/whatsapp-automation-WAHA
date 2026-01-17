import axios, { AxiosInstance } from 'axios';

export interface FormSchema {
  title: string;
  field_definitions: string[]; // Simplification for prompt
}

export interface ExtractedData {
  extracted_fields: Record<string, any>;
  missing_fields: string[];
  validation_errors: string[];
  confidence_score: number;
  next_question: string;
}

export class BiznetGioClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BIZNET_API_KEY || '';
    this.client = axios.create({
      baseURL: process.env.BIZNET_BASE_URL || 'https://api.biznetgio.ai/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  async processMessage(
    userMessage: string,
    currentData: Record<string, any>,
    formSchema: FormSchema
  ): Promise<ExtractedData> {
    const systemPrompt = this.buildSystemPrompt(formSchema, currentData);

    try {
      const response = await this.client.post('/chat/completions', {
        model: process.env.BIZNET_MODEL || 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2, // Low temp for extraction
      });

      const content = response.data.choices[0].message.content;
      return this.parseResponse(content);
    } catch (error) {
      console.error('[Biznet Client] Error processing message:', error);
      throw error;
    }
  }

  private buildSystemPrompt(schema: FormSchema, currentData: Record<string, any>): string {
    return `You are an intelligent form-filling assistant.
    
GOAL: Extract information to fill the following form: "${schema.title}".
REQUIRED FIELDS: ${JSON.stringify(schema.field_definitions)}
CURRENTLY COLLECTED DATA: ${JSON.stringify(currentData)}

INSTRUCTIONS:
1. Analyze the USER MESSAGE.
2. Extract any new information relevant to the REQUIRED FIELDS.
3. Compare with CURRENTLY COLLECTED DATA.
4. If fields are missing, formulate the "next_question" to ask the user.
5. If all fields are present, "next_question" should be "CONFIRM".

Output MUST be a valid JSON object with this structure:
{
  "extracted_fields": { "field_name": "value" },
  "missing_fields": ["field1", "field2"],
  "next_question": "Question to user..."
}
`;
  }

  private parseResponse(content: string): ExtractedData {
    try {
      // Attempt to find JSON block if AI wraps it in markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[Biznet Client] JSON Parse Error:', content);
      return {
        extracted_fields: {},
        missing_fields: [],
        validation_errors: ['Failed to parse AI response'],
        confidence_score: 0,
        next_question: 'Maaf, saya kurang paham. Bisa diulangi?',
      };
    }
  }

  async generateResponse(userMessage: string): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: process.env.BIZNET_MODEL || 'openai/gpt-oss-20b',
        messages: [
           { role: 'system', content: 'You are a helpful assistant.' },
           { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
      });
      return response.data.choices[0].message.content;
    } catch (error) {
       console.error('[Biznet Client] Chat Error:', error);
       return "Maaf, saya sedang mengalami gangguan.";
    }
  }

  async generateSpecificResponse(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: process.env.BIZNET_MODEL || 'openai/gpt-oss-20b',
        messages: [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
      });
      return response.data.choices[0].message.content;
    } catch (error) {
       console.error('[Biznet Client] Specific Response Error:', error);
       return "Maaf, saya sedang mengalami gangguan.";
    }
  }
}
