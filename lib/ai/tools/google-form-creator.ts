import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleAppsScriptClient } from '@/lib/google-apps-script';
import { FormQuestion } from '@/lib/google-forms-oauth-client';

export class GoogleFormCreatorTool implements AITool {
  name = 'Google Form Creator';
  description = 'Membantu membuat Google Form secara otomatis berdasarkan permintaan pengguna';
  
  private biznet: BiznetGioClient;
  private gas: GoogleAppsScriptClient;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.gas = new GoogleAppsScriptClient();
  }

  getSystemPrompt(): string {
    return `You are a specialized Google Form creation assistant.
    
INSTRUCTIONS:
1. Analyze the user's request to identify:
   - FORM TITLE
   - FORM DESCRIPTION (if mentioned with keywords: "deskripsi", "keterangan", "penjelasan", "sertakan")
   - LIST OF QUESTIONS/FIELDS
   - QUESTION TYPE for each field
   - OPTIONS (if applicable for choice/radio/checkbox/dropdown)
   - Whether field is REQUIRED

2. Question types available:
   - "text" = Short answer (nama, email, nomor telepon)
   - "paragraph" = Long answer (alamat, deskripsi, saran)
   - "radio" = Multiple choice, single selection (pilih satu)
   - "checkbox" = Multiple choice, multiple selection (pilih beberapa)
   - "dropdown" = Dropdown menu
   - "scale" = Linear scale (rating 1-5, 1-10, etc)
   - "date" = Date picker
   - "time" = Time picker

3. Output STRICTLY in this JSON format:
{
  "title": "Form Title Here",
  "description": "Optional form description/explanation",
  "questions": [
    {
      "title": "Question text",
      "type": "text|paragraph|radio|checkbox|dropdown|scale|date|time",
      "required": true|false,
      "options": ["option1", "option2"],
      "low": 1,
      "high": 5,
      "lowLabel": "Label for low",
      "highLabel": "Label for high"
    }
  ]
}

EXAMPLES:

User: "Buatkan form pendaftaran event dengan nama, email, dan pilih sesi"
Output:
{
  "title": "Form Pendaftaran Event",
  "questions": [
    {"title": "Nama Lengkap", "type": "text", "required": true},
    {"title": "Email", "type": "text", "required": true},
    {"title": "Pilih Sesi", "type": "radio", "required": true, "options": ["Pagi", "Siang", "Malam"]}
  ]
}

User: "Buatkan formulir pendaftaran makan kerupuk tingkat desa sertakan deskripsi 'ini adalah lomba menyenangkan'"
Output:
{
  "title": "Formulir Pendaftaran Makan Kerupuk Tingkat Desa",
  "description": "Ini adalah lomba menyenangkan",
  "questions": [
    {"title": "Nama Peserta", "type": "text", "required": true},
    {"title": "Desa Asal", "type": "text", "required": true}
  ]
}

User: "Form survey kepuasan dengan rating 1-5 dan saran"
Output:
{
  "title": "Survey Kepuasan",
  "questions": [
    {"title": "Rating Kepuasan", "type": "scale", "required": true, "low": 1, "high": 5, "lowLabel": "Tidak Puas", "highLabel": "Sangat Puas"},
    {"title": "Saran dan Masukan", "type": "paragraph", "required": false}
  ]
}

IMPORTANT:
- Only output valid JSON
- If unclear, ask for clarification
- Infer sensible defaults (e.g., nama/email = required, saran = not required)
- For choice questions without explicit options, provide sensible defaults`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log('[GoogleFormTool] Processing request:', query);
      
      // 1. Get structured data from AI
      const aiResponse = await this.biznet.generateSpecificResponse(
        this.getSystemPrompt(), 
        query
      );
      
      console.log('[GoogleFormTool] AI Response:', aiResponse);
      
      // 2. Parse JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return {
          success: false,
          reply: 'Maaf, saya kesulitan memahami struktur form yang Anda inginkan. Bisa tolong dijelaskan lebih detail?\n\nContoh: "Buatkan form pendaftaran dengan pertanyaan nama, email, dan pilih sesi (pagi/siang/malam)"'
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      
      // 3. Validate data structure
      if (!data.title || !data.questions || !Array.isArray(data.questions)) {
        return {
          success: false,
          reply: 'Format form tidak valid. Mohon sebutkan judul form dan pertanyaan-pertanyaannya.'
        };
      }

      // 4. Map to Google Forms structure
      const questions: FormQuestion[] = data.questions.map((q: any) => {
        const question: FormQuestion = {
          title: q.title,
          type: this.mapQuestionType(q.type),
          required: q.required !== false, // Default to required
        };

        // Add options for choice-based questions
        if (['radio', 'checkbox', 'dropdown'].includes(question.type) && q.options) {
          question.options = q.options;
        }

        // Add scale parameters
        if (question.type === 'scale') {
          question.low = q.low || 1;
          question.high = q.high || 5;
          question.lowLabel = q.lowLabel;
          question.highLabel = q.highLabel;
        }

        return question;
      });

      console.log('[GoogleFormTool] Creating form:', data.title);
      console.log('[GoogleFormTool] Description:', data.description || '(none)');
      console.log('[GoogleFormTool] Questions:', JSON.stringify(questions, null, 2));

      // 5. Create the form and sheet using GAS
      const result = await this.gas.createFormAndSheet({
        title: data.title,
        description: data.description,
        questions: questions
      });

      console.log('[GoogleFormTool] Form & Sheet created successfully:', result.formId, result.spreadsheetId);

      // 6. Format response
      const questionList = questions.map((q, i) => 
        `${i + 1}. ${q.title} (${this.getQuestionTypeLabel(q.type)}${q.required ? ', wajib diisi' : ''})`
      ).join('\n');

      return {
        success: true,
        reply: `✅ *Form & Spreadsheet Berhasil Dibuat!*\n\n📄 *${result.title}*\n\n📝 Pertanyaan:\n${questionList}\n\n🔗 *Link Form:*\n${result.url}\n\n📊 *Link Spreadsheet (Respons):*\n${result.spreadsheetUrl}\n\n✏️ *Edit Form:*\n${result.editUrl}\n\nAda lagi yang bisa saya bantu?`,
        newState: { 
          lastFormId: result.formId,
          lastFormUrl: result.url,
          lastFormEditUrl: result.editUrl,
          lastSpreadsheetId: result.spreadsheetId,
          lastSpreadsheetUrl: result.spreadsheetUrl
        }
      };

    } catch (error: any) {
      console.error('[GoogleFormTool] Execution Error:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('invalid_grant')) {
        return {
          success: false,
          reply: 'Mohon maaf, terjadi masalah dengan authorization. Silakan hubungi administrator untuk refresh OAuth token.'
        };
      }
      
      return {
        success: false,
        reply: 'Mohon maaf, terjadi kesalahan teknis saat mencoba membuat form Anda. Silakan coba lagi sebentar lagi atau hubungi administrator jika masalah berlanjut.'
      };
    }
  }

  /**
   * Map AI-provided question type to valid FormQuestion type
   */
  private mapQuestionType(type: string): FormQuestion['type'] {
    const typeMap: Record<string, FormQuestion['type']> = {
      'text': 'text',
      'paragraph': 'paragraph',
      'choice': 'radio',
      'radio': 'radio',
      'checkbox': 'checkbox',
      'dropdown': 'dropdown',
      'scale': 'scale',
      'date': 'date',
      'time': 'time'
    };

    return typeMap[type.toLowerCase()] || 'text';
  }

  /**
   * Get human-readable label for question type
   */
  private getQuestionTypeLabel(type: FormQuestion['type']): string {
    const labels: Record<FormQuestion['type'], string> = {
      'text': 'jawaban singkat',
      'paragraph': 'jawaban panjang',
      'radio': 'pilihan ganda',
      'checkbox': 'kotak centang',
      'dropdown': 'dropdown',
      'scale': 'skala linear',
      'date': 'tanggal',
      'time': 'waktu',
      'choice': 'pilihan ganda'
    };

    return labels[type] || type;
  }
}
