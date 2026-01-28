import { AITool, ToolContext, ToolResponse } from '../types';
import { BiznetGioClient } from '@/lib/biznetgio-client';
import { GoogleFormsOAuthClient } from '@/lib/google-forms-oauth-client';
import { Prompts } from '../prompts';

export class FormContributorTool implements AITool {
  name = 'Form Contributor';
  description = 'Membantu menambahkan email orang lain sebagai editor/kontributor pada Google Form';
  
  private biznet: BiznetGioClient;
  private googleForms: GoogleFormsOAuthClient;

  constructor() {
    this.biznet = new BiznetGioClient();
    this.googleForms = new GoogleFormsOAuthClient();
  }

  getSystemPrompt(): string {
    return Prompts.formContributor(''); // The prompt function expects a query but we use it in execute
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      console.log(`[FormContributorTool] Processing request: ${query}`);
      
      // 1. Extract email and form name using AI
      const prompt = Prompts.formContributor(query);
      const aiResponse = await this.biznet.generateSpecificResponse(prompt, query);
      
      console.log('[FormContributorTool] AI Response:', aiResponse);
      
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          reply: 'Maaf, saya tidak menemukan alamat email yang valid di pesan Anda. Silakan sebutkan alamat emailnya.\n\nContoh: "tambahkan email joni@gmail.com ke form ini"'
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      const email = data.email;
      const formName = data.formName;

      if (!email || !email.includes('@')) {
        return {
          success: false,
          reply: 'Maaf, alamat email yang Anda berikan tidak valid. Mohon periksa kembali emailnya.'
        };
      }

      // 2. Identify the formId
      let formId = context.sessionState?.lastFormId;
      let targetFormTitle = context.sessionState?.lastFormTitle || 'Form terakhir';

      // If user specified a form name, try to find it in history
      if (formName && formName !== 'NONE') {
        const createdForms = context.sessionState?.createdForms || [];
        const matchingForm = createdForms.find((f: any) => 
          f.title.toLowerCase().includes(formName.toLowerCase())
        );
        
        if (matchingForm) {
          formId = matchingForm.id;
          targetFormTitle = matchingForm.title;
          console.log(`[FormContributorTool] Found matching form for "${formName}": ${targetFormTitle} (${formId})`);
        } else {
          console.log(`[FormContributorTool] No matching form found for "${formName}". Using last form: ${targetFormTitle}`);
        }
      }

      if (!formId) {
        return {
          success: false,
          reply: 'Maaf, saya tidak tahu form mana yang ingin Anda bagikan. Silakan buat form terlebih dahulu atau sebutkan judul form-nya.'
        };
      }

      // 3. Add contributor via Drive API
      console.log(`[FormContributorTool] Adding ${email} to form: ${targetFormTitle} (${formId})`);
      await this.googleForms.addContributor(formId, email);

      return {
        success: true,
        reply: `✅ Akun *${email}* telah berhasil ditambahkan sebagai editor (kontributor) pada Google Form *"${targetFormTitle}"*.\n\nMereka akan menerima email notifikasi dari Google.`
      };

    } catch (error: any) {
      console.error('[FormContributorTool] Execution Error:', error);
      return {
        success: false,
        reply: `Maaf, terjadi kesalahan saat mencoba menambahkan kontributor: ${error.message}`
      };
    }
  }
}
