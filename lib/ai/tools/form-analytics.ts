import { AITool, ToolContext, ToolResponse } from '../types';
import { GoogleFormsOAuthClient } from '../../google-forms-oauth-client';
import { Prompts } from '../prompts';

interface AnalyticsParams {
  query: string;
}

export class FormAnalyticsTool implements AITool {
  name = 'form_analytics';
  description = 'Check responses/statistics for a specific Google Form. Use this when the user asks about "how many responses", "who filled the form", etc.';
  
  private googleForms: GoogleFormsOAuthClient;

  constructor() {
    this.googleForms = new GoogleFormsOAuthClient();
  }

  getSystemPrompt(): string {
      return `Use this tool when the user asks about the status, response count, or statistics of a specific Google Form. 
      The query should be the name of the form they are asking about.`;
  }

  async execute(query: string, context: ToolContext): Promise<ToolResponse> {
    try {
      // query is the full user message, e.g., "Berapa responden form Lomba Mancing?"
      // We need to extract the form name first using AI
      
      const session = context.sessionState || {};
      const createdForms = session.createdForms || [];

      const { BiznetGioClient } = await import('../../biznetgio-client');
      const ai = new BiznetGioClient();

      if (!createdForms || createdForms.length === 0) {
        const errorPrompt = `Inform the user that no forms are recorded in memory in the same language as their query: "${query}". Be helpful and friendly. No bold formatting.`;
        const errorReply = await ai.generateSpecificResponse(errorPrompt, query);
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '')}`
        };
      }

      // Check if this is a follow-up request (no form name mentioned, but asking about data like email)
      const followUpPatterns = ['sertakan', 'tambahkan', 'dengan email', 'emailnya', 'lihat email', 'tampilkan email'];
      const isFollowUpRequest = followUpPatterns.some(p => query.toLowerCase().includes(p));
      
      let matchedForm: any = null;
      let formName = '';
      
      if (isFollowUpRequest && session.lastFormId) {
        // Use the last form from context
        matchedForm = createdForms.find((f: any) => f.id === session.lastFormId);
        formName = matchedForm?.title || 'form sebelumnya';
        console.log(`[FormAnalytics] Using context form: ${formName} (${session.lastFormId})`);
      } else {
        // Extract form name from query using AI
        const extractionPrompt = Prompts.formNameExtraction(query);

        const extractedFormName = await ai.generateSpecificResponse(extractionPrompt, query);
        formName = extractedFormName.trim();
        
        console.log(`[FormAnalytics] Extracted form name: "${formName}" from query: "${query}"`);

        // If no form name extracted but have lastFormId in context, use that
        if ((formName === 'NONE' || formName === '') && session.lastFormId) {
          matchedForm = createdForms.find((f: any) => f.id === session.lastFormId);
          formName = matchedForm?.title || 'form sebelumnya';
          console.log(`[FormAnalytics] No form name in query, using context: ${formName}`);
        } else {
          // 2. Find the matching form by name
          matchedForm = this.findMatchingForm(formName, createdForms);
        }
      }

      if (!matchedForm) {
        const formList = createdForms.map((f: any) => `- ${f.title}`).join('\n');
        const errorPrompt = `Inform the user that a form with name "${formName}" was not found in the same language as their query: "${query}". 
        Mention these available forms:\n${formList}\nNo bold formatting.`;
        const errorReply = await ai.generateSpecificResponse(errorPrompt, query);
        
        return {
          success: false,
          reply: `❌ ${errorReply.replace(/\*/g, '')}`
        };
      }

      // 3. Fetch form structure to get question titles
      console.log(`[FormAnalytics] Fetching form structure for: ${matchedForm.id}`);
      const formStructure = await this.googleForms.getForm(matchedForm.id);
      
      // Build question ID to title mapping
      const questionTitleMap: Record<string, string> = {};
      if (formStructure.items) {
        for (const item of formStructure.items) {
          if (item.questionItem?.question?.questionId && item.title) {
            questionTitleMap[item.questionItem.question.questionId] = item.title;
          }
        }
      }
      console.log(`[FormAnalytics] Question title map:`, questionTitleMap);

      // 4. Fetch responses from Google API
      console.log(`[FormAnalytics] Fetching responses for: ${matchedForm.title} (${matchedForm.id})`);
      const responses = await this.googleForms.getResponses(matchedForm.id);
      
      // 5. Analyze data
      const totalResponses = responses.length;
      const lastResponse = totalResponses > 0 ? responses[responses.length - 1] : null;
      
      let lastUpdateTxt = '-';
      if (lastResponse && lastResponse.lastSubmittedTime) {
          const date = new Date(lastResponse.lastSubmittedTime);
          lastUpdateTxt = date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      }

      // 6. Extract respondent names using question title mapping
      let respondentList: string[] = [];
      if (totalResponses > 0) {
        const recent = responses.slice(-10).reverse(); // Get up to 10 recent responses
        
        // Find name field question ID using keywords
        const nameKeywords = ['nama', 'name', 'full name', 'nama lengkap', 'respondent', 'peserta'];
        let nameQuestionId: string | null = null;
        
        for (const [qId, title] of Object.entries(questionTitleMap)) {
          const titleLower = (title as string).toLowerCase();
          if (nameKeywords.some(keyword => titleLower.includes(keyword))) {
            nameQuestionId = qId;
            console.log(`[FormAnalytics] Found name field: "${title}" (ID: ${qId})`);
            break;
          }
        }
        
        respondentList = recent.map((r: any) => {
          let name = r.respondentEmail || 'Unknown';
          
          if (r.answers && nameQuestionId && r.answers[nameQuestionId]) {
            const nameAnswer = r.answers[nameQuestionId];
            if (nameAnswer.textAnswers?.answers?.[0]?.value) {
              name = nameAnswer.textAnswers.answers[0].value;
            }
          }
          
          return name;
        });
      }

      // 7. Detect query intent using AI
      const intentPrompt = Prompts.analyticsIntent(query);

      const intentResponse = await ai.generateSpecificResponse(intentPrompt, query);
      const queryIntent = intentResponse.trim().toUpperCase();
      
      console.log(`[FormAnalytics] Detected query intent: ${queryIntent}`);

      let responseData = {
        formTitle: matchedForm.title,
        totalResponses,
        lastUpdateTxt,
        formUrl: matchedForm.url,
        respondentNames: respondentList
      };

      // Generate natural response using AI with WhatsApp formatting
      const responsePrompt = Prompts.analyticsResponse({
        formTitle: responseData.formTitle,
        totalResponses: `${responseData.totalResponses}`,
        lastUpdateTxt: responseData.lastUpdateTxt,
        respondentNames: responseData.respondentNames,
        formUrl: responseData.formUrl,
        query,
        queryIntent
      });

      const finalReply = await ai.generateSpecificResponse(responsePrompt, query);

      // Post-process: Convert escaped characters to actual formatting and strip markdown-style bold
      const formattedReply = finalReply
        .trim()
        .replace(/\\n/g, '\n')  // Convert \n to actual newline
        .replace(/\*\*/g, '');  // Strip double asterisks (markdown) but keep single for WhatsApp

      return {
        success: true,
        reply: formattedReply,
        newState: {
          lastFormId: matchedForm.id,
          lastFormTitle: matchedForm.title
        }
      };

    } catch (error: any) {
      console.error('[FormAnalytics] Error:', error);
      return {
        success: false,
        reply: `❌ Terjadi kesalahan saat mengambil data: ${error.message}`
      };
    }
  }

  private findMatchingForm(query: string, forms: any[]): any {
      const lowerQuery = query.toLowerCase();
      
      // 1. Exact match
      const exact = forms.find((f: any) => f.title.toLowerCase() === lowerQuery);
      if (exact) return exact;

      // 2. Contains match
      const contains = forms.find((f: any) => f.title.toLowerCase().includes(lowerQuery));
      if (contains) return contains;
      
      // 3. Fuzzy match using similarity score (typo tolerance)
      let bestMatch: any = null;
      let bestScore = 0;
      
      for (const form of forms) {
        const score = this.calculateSimilarity(lowerQuery, form.title.toLowerCase());
        if (score > bestScore && score > 0.5) { // 50% similarity threshold
          bestScore = score;
          bestMatch = form;
        }
      }
      
      if (bestMatch) {
        console.log(`[FormAnalytics] Fuzzy match found: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
        return bestMatch;
      }
      
      return null;
  }

  /**
   * Calculate similarity between two strings using Dice's coefficient
   * Returns 0-1 where 1 is identical
   */
  private calculateSimilarity(str1: string, str2: string): number {
      if (str1 === str2) return 1.0;
      
      // Convert to bigrams
      const bigrams1 = this.getBigrams(str1);
      const bigrams2 = this.getBigrams(str2);
      
      if (bigrams1.length === 0 || bigrams2.length === 0) return 0;
      
      // Count matches
      let matches = 0;
      for (const bigram of bigrams1) {
          const index = bigrams2.indexOf(bigram);
          if (index >= 0) {
              matches++;
              bigrams2.splice(index, 1); // Remove to avoid double counting
          }
      }
      
      return (2 * matches) / (bigrams1.length + bigrams2.length);
  }

  private getBigrams(str: string): string[] {
      const bigrams: string[] = [];
      for (let i = 0; i < str.length - 1; i++) {
          bigrams.push(str.substring(i, i + 2));
      }
      return bigrams;
  }
}
