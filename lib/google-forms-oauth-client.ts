import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface FormQuestion {
  title: string;
  type: 'text' | 'paragraph' | 'choice' | 'radio' | 'checkbox' | 'dropdown' | 'scale' | 'date' | 'time';
  options?: string[];
  required?: boolean;
  // For scale questions
  low?: number;
  high?: number;
  lowLabel?: string;
  highLabel?: string;
}

export interface FormSettings {
  description?: string;
  collectEmail?: boolean;
  limitOneResponse?: boolean;
  isQuiz?: boolean;
  confirmationMessage?: string;
}

export class GoogleFormsOAuthClient {
  private oauth2Client: OAuth2Client;
  private forms;

  constructor() {
    // Initialize OAuth2 Client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
    );

    // Set credentials if refresh token is available
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });
    }

    this.forms = google.forms({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth URL for user authorization
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/forms.body',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/drive',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Set tokens manually
   */
  setTokens(tokens: { access_token?: string; refresh_token?: string }) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new Google Form
   */
  async createForm(title: string, questions: FormQuestion[], settings?: FormSettings) {
    try {
      // 1. Create Form
      const createResponse = await this.forms.forms.create({
        requestBody: { 
          info: { 
            title,
            documentTitle: title 
          } 
        },
      });

      const formId = createResponse.data.formId;
      if (!formId) throw new Error('Failed to create form ID');

      // 2. Build requests for questions
      const requests: any[] = [];

      // Add questions
      questions.forEach((q, index) => {
        requests.push({
          createItem: {
            item: {
              title: q.title,
              questionItem: {
                question: {
                  required: q.required || false,
                  ...this.buildQuestionConfig(q)
                }
              }
            },
            location: { index }
          }
        });
      });

      // Add description if provided
      if (settings?.description) {
        requests.push({
          updateFormInfo: {
            info: {
              description: settings.description
            },
            updateMask: 'description'
          }
        });
      }

      // Note: Settings like collectEmail, limitOneResponse, etc. 
      // are configured through the Google Forms UI or require separate API calls

      // 3. Apply all changes
      if (requests.length > 0) {
        await this.forms.forms.batchUpdate({
          formId,
          requestBody: { requests }
        });
      }

      return {
        formId,
        title: createResponse.data.info?.title,
        url: createResponse.data.responderUri,
        editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
      };

    } catch (error: any) {
      console.error('[GoogleFormsOAuth] Error creating form:', error);
      throw error;
    }
  }

  /**
   * Get form details
   */
  async getForm(formId: string) {
    try {
      const response = await this.forms.forms.get({ formId });
      return response.data;
    } catch (error) {
      console.error('[GoogleFormsOAuth] Error fetching form:', error);
      throw error;
    }
  }

  /**
   * Get form responses
   */
  async getResponses(formId: string) {
    try {
      const response = await this.forms.forms.responses.list({ formId });
      return response.data.responses || [];
    } catch (error) {
      console.error('[GoogleFormsOAuth] Error fetching responses:', error);
      throw error;
    }
  }

  /**
   * Update form (add/remove questions)
   */
  async updateForm(formId: string, updates: any[]) {
    try {
      await this.forms.forms.batchUpdate({
        formId,
        requestBody: { requests: updates }
      });
      return { success: true };
    } catch (error) {
      console.error('[GoogleFormsOAuth] Error updating form:', error);
      throw error;
    }
  }

  /**
   * Build question configuration based on type
   */
  private buildQuestionConfig(question: FormQuestion) {
    switch (question.type) {
      case 'text':
        return { textQuestion: { paragraph: false } };
      
      case 'paragraph':
        return { textQuestion: { paragraph: true } };
      
      case 'choice':
      case 'radio':
        return {
          choiceQuestion: {
            type: 'RADIO',
            options: (question.options || []).map(opt => ({ value: opt }))
          }
        };
      
      case 'checkbox':
        return {
          choiceQuestion: {
            type: 'CHECKBOX',
            options: (question.options || []).map(opt => ({ value: opt }))
          }
        };
      
      case 'dropdown':
        return {
          choiceQuestion: {
            type: 'DROP_DOWN',
            options: (question.options || []).map(opt => ({ value: opt }))
          }
        };
      
      case 'scale':
        return {
          scaleQuestion: {
            low: question.low || 1,
            high: question.high || 5,
            lowLabel: question.lowLabel,
            highLabel: question.highLabel
          }
        };
      
      case 'date':
        return {
          dateQuestion: {
            includeTime: false,
            includeYear: true
          }
        };
      
      case 'time':
        return {
          timeQuestion: {
            duration: false
          }
        };
      
      default:
        return { textQuestion: { paragraph: false } };
    }
  }
}
