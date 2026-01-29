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
        const errorPrompt = `Inform the user that you couldn't find a valid email in their request: "${query}". Suggest they provide an email, e.g., "tambahkan email joni@gmail.com". Use the same language as the query. No bold formatting.`;
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '').trim()}`
        };
      }

      const data = JSON.parse(jsonMatch[0]);
      const email = data.email;
      const formName = data.formName;

      if (!email || !email.includes('@')) {
        const errorPrompt = `Inform the user that the email they provided is invalid in the same language as their query: "${query}". No bold formatting.`;
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '').trim()}`
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
        const errorPrompt = `Inform the user that you don't know which form to share in the same language as their query: "${query}". Suggest they mention the form name or create one first. No bold formatting.`;
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '').trim()}`
        };
      }

      // 3. Add contributor via Drive API
      console.log(`[FormContributorTool] Adding ${email} to form: ${targetFormTitle} (${formId})`);
      await this.googleForms.addContributor(formId, email);

      const finalReply = await this.biznet.generateSpecificResponse(
        Prompts.formContributorSuccess({
          email: email,
          formTitle: targetFormTitle,
          query: query
        }),
        query
      );

      // Post-process: Convert escaped \n and strip bold
      const formattedReply = finalReply
        .trim()
        .replace(/\\n/g, '\n')
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold**
        .replace(/\*([^*]+)\*/g, '$1');     // Remove *italic*

      return {
        success: true,
        reply: formattedReply
      };

    } catch (error: any) {
      console.error('[FormContributorTool] Execution Error:', error);
      
      const errorPrompt = `Inform the user that an error occurred while adding a contributor in the same language as their query: "${query}". 
      Error details (context only): ${error.message}. No bold formatting.`;
      
      try {
        const errorReply = await this.biznet.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '').trim()}`
        };
      } catch (aiError) {
        return {
          success: false,
          reply: '❌ Sorry, an error occurred while adding the contributor.'
        };
      }
    }
  }
}
