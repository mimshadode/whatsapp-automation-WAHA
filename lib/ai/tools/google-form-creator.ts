import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleFormsOAuthClient, FormQuestion } from '@/lib/google-forms-oauth-client';

export class GoogleFormCreatorTool implements AITool {
  name = 'Google Form Creator';
  description = 'Membantu membuat Google Form secara otomatis berdasarkan permintaan pengguna';
  
  private biznet: BiznetGioClient;
  private googleForms: GoogleFormsOAuthClient;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.googleForms = new GoogleFormsOAuthClient();
  }

  getSystemPrompt(): string {
    return `You are a specialized Google Form creation assistant.
    
INSTRUCTIONS:
1. Analyze the user's request to identify:
   - FORM TITLE
   - FORM DESCRIPTION (if mentioned with keywords: "deskripsi", "keterangan", "penjelasan", "sertakan")
   - EMAIL COLLECTION SETTING (if mentioned, map to: "VERIFIED", "RESPONDER_INPUT", or "DO_NOT_COLLECT")
   - LIST OF QUESTIONS/FIELDS
   - QUESTION TYPE for each field
   - OPTIONS (if applicable for choice/radio/checkbox/dropdown)
   - Whether field is REQUIRED

2. SPECIAL CASE - EXTRACTED DOCUMENT TEXT:
   If the user message contains "[TEKS DARI MEDIA]:" or "[TEKS DARI FILE YANG DIBALAS]:", this means the text was extracted from a document (PDF, image, etc).
   In this case:
   - Analyze the extracted text carefully to identify form fields, questions, or survey items.
   - Look for patterns like numbered lists, bullets, or labeled fields (e.g., "Nama:", "Email:", etc.).
   - If the document is a questionnaire or survey ("Angket"), extract each question.
   - For table-like questions (e.g. "SS S KS TS" or "Sangat Setuju" columns), identify the question text and use "radio" or "scale" type.
   - If you see a list of statements with agreement columns, create a "radio" question for each statement with options ["Sangat Setuju", "Setuju", "Kurang Setuju", "Tidak Setuju", "Sangat Tidak Setuju"].
   - If the document is a registration form template, identify all input fields.
   - ALWAYS prioritize finding the title from the document text itself. Look for:
     * Headers/Big text at the top
     * Phrases like "Judul Penelitian:", "Tema:", "Nama Kegiatan:", "Lampiran -"
     * If a research title is mentioned in the introductory text (e.g. "Penelitian dengan judul X"), use that.
   - If NO clear title is found in the text, use the filename (without extension).
   - EXTRACT FORM DESCRIPTION: Look for introductory paragraphs, "Kata Pengantar", or greetings (e.g., "Assalamu’alaikum", "Dengan hormat"). identifying the text explaining the purpose of the research/form. If found, use this FULL text as the form description.
   - ALWAYS output valid JSON even if the document is unclear - make your best guess.

3. Question types available:
   - "text" = Short answer (nama, email, nomor telepon)
   - "paragraph" = Long answer (alamat, deskripsi, saran, pertanyaan esai)
   - "radio" = Multiple choice, single selection (pilih satu, skala likert)
   - "checkbox" = Multiple choice, multiple selection (pilih beberapa)
   - "dropdown" = Dropdown menu
   - "scale" = Linear scale (rating 1-5, 1-10, etc)
   - "date" = Date picker
   - "time" = Time picker

4. Output STRICTLY in this JSON format:
{
  "title": "Form Title Here",
  "description": "Optional form description/explanation",
  "emailCollectionType": "VERIFIED|RESPONDER_INPUT|DO_NOT_COLLECT",
  "questions": [
    {
      "title": "Question text or Section Title",
      "type": "text|paragraph|radio|checkbox|dropdown|scale|date|time|section",
      "description": "Optional question or section description",
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

User: "[TEKS DARI MEDIA]: Nama responden: ... NIM: ... Judul penelitian: ... 1. Bagaimana pendapat Anda tentang X? 2. Apakah Anda setuju dengan Y?"
Output:
{
  "title": "Form Penelitian",
  "questions": [
    {"title": "Nama Responden", "type": "text", "required": true},
    {"title": "NIM", "type": "text", "required": true},
    {"title": "Bagaimana pendapat Anda tentang X?", "type": "paragraph", "required": true},
    {"title": "Apakah Anda setuju dengan Y?", "type": "radio", "required": true, "options": ["Sangat Setuju", "Setuju", "Netral", "Tidak Setuju", "Sangat Tidak Setuju"]}
  ]
}

IMPORTANT:
- Only output valid JSON
- If analyzing extracted document text, ALWAYS generate a form based on your best interpretation
- Infer sensible defaults (e.g., nama/email = required, saran = not required)
- For choice questions without explicit options, provide sensible defaults (like Likert scale for opinions)`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log(`[GoogleFormTool] Processing request (Length: ${query.length} chars). Preview: ${query.substring(0, 50)}...`);
      
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

      // 5. Create the form using OAuth Client
      const result = await this.googleForms.createForm(
        data.title,
        questions,
        { 
          description: data.description,
          emailCollectionType: data.emailCollectionType
        }
      );

      console.log('[GoogleFormTool] Form created successfully:', result.formId);

      // 6. Format response
      // 6. Format response (Show only total count as requested)
      const questionCount = questions.length;
      const descriptionTxt = data.description ? `\n\n📝 *Deskripsi:* ${data.description}` : '';

      return {
        success: true,
        reply: `✅ *Form Berhasil Dibuat!*\n\n📄 *Nama Form:* ${result.title}\n\n📊 *Total Pertanyaan:* ${questionCount} pertanyaan\n\n🔗 *Link Form:*\n${result.url}\n\n✏️ *Edit Form:*\n${result.editUrl}\n\nAda lagi yang bisa saya bantu?`,
        newState: { 
          lastFormId: result.formId,
          lastFormUrl: result.url,
          lastFormEditUrl: result.editUrl
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
      'time': 'time',
      'section': 'section'
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
      'choice': 'pilihan ganda',
      'section': 'bagian baru'
    };

    return labels[type] || type;
  }
}
