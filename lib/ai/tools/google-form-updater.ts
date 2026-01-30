import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleFormsOAuthClient, FormQuestion } from '@/lib/google-forms-oauth-client';
import { Prompts } from '../prompts';

export class GoogleFormUpdaterTool implements AITool {
  name = 'Google Form Updater';
  description = 'Membantu mengupdate/mengedit Google Form yang sudah ada (tambah pertanyaan, ganti judul)';
  
  private biznet: BiznetGioClient;
  private googleForms: GoogleFormsOAuthClient;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.googleForms = new GoogleFormsOAuthClient();
  }

  getSystemPrompt(): string {
    return Prompts.googleFormUpdater;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log(`[GoogleFormUpdater] Processing update request: ${query.substring(0, 50)}...`);
      
      // 1. Get structured data from AI
      const aiResponse = await this.biznet.generateSpecificResponse(
        this.getSystemPrompt(), 
        query
      );
      
      console.log('[GoogleFormUpdater] AI Response:', aiResponse);
      
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         return { success: false, reply: "Maaf, saya gagal memahami format update yang diminta. Bisa diperjelas?" };
      }

      const data = JSON.parse(jsonMatch[0]);
      const target = data.targetForm;
      const mods = data.modifications;

      if (!target.name && !target.id) {
         return { success: false, reply: "Form mana yang mau diupdate? Tolong sebutkan nama formnya ya." };
      }

      // 2. Resolve Form ID
      let formId = target.id;
      let formTitle = target.name;
      
      if (!formId && target.name) {
          formId = await this.googleForms.findFormIdByName(target.name);
          if (!formId) {
             return { success: false, reply: `Maaf, saya tidak menemukan form dengan nama "${target.name}". Pastikan nama formnya benar ya.` };
          }
      }

      // 3. Apply Updates
      const results = [];

      // Update Info (Title/Description)
      if (mods.updateTitle || mods.updateDescription) {
          await this.googleForms.updateInfo(formId, mods.updateTitle, mods.updateDescription);
          results.push("Info form (Judul/Deskripsi) berhasil diupdate.");
          if (mods.updateTitle) formTitle = mods.updateTitle;
      }

      // Add Questions
      if (mods.addQuestions && Array.isArray(mods.addQuestions) && mods.addQuestions.length > 0) {
          const questionsToAdd: FormQuestion[] = mods.addQuestions.map((q: any) => ({
              title: q.title,
              type: this.mapQuestionType(q.type),
              required: q.required !== false,
              options: q.options,
              description: q.description
          }));

          await this.googleForms.addQuestions(formId, questionsToAdd);
          results.push(`Berhasil menambahkan ${questionsToAdd.length} pertanyaan baru.`);
      }

      if (results.length === 0) {
          return { success: true, reply: "Oke, saya sudah cek tapi sepertinya tidak ada perubahan yang perlu dilakukan." };
      }

      const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
      const reply = `Siap! Update form "${formTitle}" berhasil! 🎉\n\n${results.join('\n')}\n\nCek formnya di sini: ${editUrl}`;

      return {
        success: true,
        reply: reply
      };

    } catch (error: any) {
      console.error('[GoogleFormUpdater] Error:', error);
      return {
        success: false,
        reply: `Duh, ada error saat update form: ${error.message || 'Unknown error'}`
      };
    }
  }

  private mapQuestionType(rawType: string): FormQuestion['type'] {
    const typeMap: Record<string, FormQuestion['type']> = {
      'text': 'text',
      'short_answer': 'text',
      'paragraph': 'paragraph',
      'long_answer': 'paragraph',
      'choice': 'radio',
      'multiple_choice': 'radio',
      'radio': 'radio',
      'checkbox': 'checkbox',
      'dropdown': 'dropdown',
      'scale': 'scale',
      'date': 'date',
      'time': 'time',
      'section': 'section',
      'file_upload': 'text' // Fallback for now as API support is limited
    };
    return typeMap[rawType.toLowerCase()] || 'text';
  }
}
