import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleFormsOAuthClient, FormQuestion } from '@/lib/google-forms-oauth-client';
import { BitlyClient } from '@/lib/bitly-client';
import { Prompts } from '../prompts';

export class GoogleFormCreatorTool implements AITool {
  name = 'Google Form Creator';
  description = 'Membantu membuat Google Form secara otomatis berdasarkan permintaan pengguna';
  
  private biznet: BiznetGioClient;
  private googleForms: GoogleFormsOAuthClient;
  private bitly: BitlyClient;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.googleForms = new GoogleFormsOAuthClient();
    this.bitly = new BitlyClient();
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
        const errorPrompt = `Inform the user that you couldn't understand the form structure they want in the same language as their query: "${query}". Be helpful and provide an example like "Buatkan form pendaftaran dengan pertanyaan nama dan email". No bold formatting.`;
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: errorReply.replace(/\*/g, '').trim()
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      
      // 3. Validate data structure
      if (!data.title || !data.questions || !Array.isArray(data.questions)) {
        const errorPrompt = `Inform the user that the form format is invalid and they should mention a title and questions in the same language as their query: "${query}". No bold formatting.`;
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: errorReply.replace(/\*/g, '').trim()
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

      // 5. Prepare Editors (Manual + Admin Default)
      const adminEmail = process.env.GOOGLE_FORM_ADMIN_EMAIL;
      const requestedEditors = data.editors || [];
      const allEditors = [...new Set([...requestedEditors].filter(e => !!e))];
      if (adminEmail && !allEditors.includes(adminEmail)) {
        console.log(`[GoogleFormTool] Adding admin email ${adminEmail} to editors list.`);
        allEditors.push(adminEmail);
      }

      // 6. Create the form using OAuth Client
      const result = await this.googleForms.createForm(
        data.title,
        questions,
        { 
          description: data.description,
          emailCollectionType: data.emailCollectionType,
          editors: allEditors
        }
      );

      console.log('[GoogleFormTool] Form created successfully:', result.formId);

      // 7. Shorten links using Bitly (Only for public URL)
      let customKeyword = data.customKeyword;
      
      // Auto-generate custom keyword from title if not provided
      if (!customKeyword && data.title) {
        customKeyword = data.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
          .trim()
          .replace(/\s+/g, '-')     // Replace spaces with hyphens
          .replace(/-+/g, '-');     // Replace multiple hyphens with single hyphen
          
        console.log(`[GoogleFormTool] Generated automatic custom keyword: ${customKeyword}`);
      }

      const shortUrl = await this.bitly.shorten(result.url || '', customKeyword);
      
      // Generate QR Code
      console.log(`[GoogleFormTool] Generating QR code for: ${shortUrl}`);
      const qrCode = await this.bitly.generateBitlyQR(shortUrl) || await this.bitly.generatePublicQR(shortUrl);
      
      // Public links are shortened, direct links for edit and spreadsheet are kept original as requested
      const editUrl = result.editUrl;
      const spreadsheetUrl = result.spreadsheetUrl;

      // 8. Share with editors if requested
      const sharedWith: string[] = [];
      if (allEditors.length > 0) {
        console.log(`[GoogleFormTool] Sharing form with ${allEditors.length} editors...`);
        for (const email of allEditors) {
          try {
            await this.googleForms.addContributor(result.formId, email);
            console.log(`[GoogleFormTool] Shared successfully with ${email}`);
            sharedWith.push(email);
          } catch (shareError: any) {
            console.error(`[GoogleFormTool] Failed to share with ${email}:`, shareError.message);
          }
        }
      }

      // 8. Format response
      const sharedTxt = sharedWith.length > 0 ? `\n\n👥 *Editor:* ${sharedWith.join(', ')}` : '';
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

      const finalReply = await this.biznet.generateSpecificResponse(
        Prompts.formCreationSuccess({
          title: result.title || 'Untitled Form',
          questionCount: questionCount,
          shortUrl: shortUrl || '',
          editUrl: editUrl || '',
          spreadsheetUrl: spreadsheetUrl || undefined,
          sharedWith: sharedWith,
          query: query
        }),
        query
      );

      // Post-process: Convert escaped \n and strip markdown-style bold (keeping single * for WhatsApp bold)
      const formattedReply = finalReply
        .trim()
        .replace(/\\n/g, '\n')
        .replace(/\*\*/g, ''); // Strip double asterisks (markdown) but keep single for WhatsApp

      return {
        success: true,
        reply: formattedReply,
        newState: { 
          lastFormId: result.formId,
          lastFormUrl: shortUrl,
          lastFormQrUrl: qrCode,
          lastFormEditUrl: editUrl,
          lastSpreadsheetUrl: spreadsheetUrl,
          createdForms: [...createdForms, newFormEntry] 
        }
      };

    } catch (error: any) {
      console.error('[GoogleFormTool] Execution Error:', error);
      
      const errorMsg = error.message || '';
      const fallbackMsg = 'Sorry, a technical error occurred. Please try again later.';
      
      const errorPrompt = `Inform the user that a technical error occurred while creating their form in the same language as their query: "${query}". 
      Error details (for context only, don't show to user unless necessary): ${errorMsg}. 
      Keep it simple and helpful. No bold formatting.`;
      
      try {
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '').trim()}`
        };
      } catch (aiError) {
        return {
          success: false,
          reply: `❌ ${fallbackMsg}`
        };
      }
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
