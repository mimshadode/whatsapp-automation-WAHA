import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleFormsOAuthClient, FormQuestion } from '@/lib/google-forms-oauth-client';
import { Prompts } from '../prompts';

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
    return Prompts.googleFormCreator;
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
      const questions: FormQuestion[] = data.questions
        .filter((q: any) => {
          // Hard-filter: Remove explicit "Email" question if email collection is enabled
          // to prevent duplicates
          if (data.emailCollectionType && 
             (data.emailCollectionType === 'VERIFIED' || data.emailCollectionType === 'RESPONDER_INPUT')) {
            const isEmail = q.title.trim().toLowerCase() === 'email';
            if (isEmail) {
              console.log('[GoogleFormTool] Removing duplicate "Email" question because email collection is enabled.');
              return false;
            }
          }
          return true;
        })
        .map((q: any) => {
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

      const name = context.senderName && context.senderName !== '.' ? ` ${context.senderName.split(' ')[0]}` : '';

      // 7. Persist to Session State for "Memory"
      // We store a list of created forms so the bot can answer "how many responses for form X?"
      const currentSession = context.sessionState || {};
      const createdForms = currentSession.createdForms || [];
      
      const newFormEntry = {
        id: result.formId,
        title: result.title,
        url: result.url,
        createdAt: new Date().toISOString()
      };
      
      // Update session state remotely
      if (context.phoneNumber) {
          // Note: We need a way to update session state from here. 
          // Since ToolContext doesn't natively support update, we rely on the orchestrator or return newState.
          // Ideally, the Orchestrator should merge `newState` into the DB.
          // For now, we return it in `newState` and assume Orchestrator handles the merge.
      }

      const spreadsheetTxt = result.spreadsheetUrl ? `\n\n📊 *Link Spreadsheet:*\n${result.spreadsheetUrl}` : '';

      return {
        success: true,
        reply: `✅ *Form Berhasil Dibuat!*\n\n📄 *Nama Form:* ${result.title}\n\n📊 *Total Pertanyaan:* ${questionCount} pertanyaan\n\n🔗 *Link Form:*\n${result.url}\n\n✏️ *Edit Form:*\n${result.editUrl}${spreadsheetTxt}\n\nAda lagi yang bisa saya bantu?`,
        newState: { 
          lastFormId: result.formId,
          lastFormUrl: result.url,
          lastFormEditUrl: result.editUrl,
          lastSpreadsheetUrl: result.spreadsheetUrl,
          // Append new form to the list (AI Orchestrator must handle merging arrays if it supports it, 
          // or we handle it here if we had direct DB access. 
          // Assuming simple replacement/append logic in Orchestrator or just passing the delta)
          createdForms: [...createdForms, newFormEntry] 
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
