import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface FormQuestion {
  title: string;
  type: 'text' | 'paragraph' | 'choice' | 'radio' | 'checkbox' | 'dropdown' | 'scale' | 'date' | 'time' | 'section';
  options?: string[];
  required?: boolean;
  description?: string;
  // For scale questions
  low?: number;
  high?: number;
  lowLabel?: string;
  highLabel?: string;
  // For text validation
  validation?: 'email' | 'url' | 'number' | 'none';
}

export interface FormSettings {
  description?: string;
  collectEmail?: boolean; // Legacy simplified flag
  emailCollectionType?: 'EMAIL_COLLECTION_TYPE_UNSPECIFIED' | 'DO_NOT_COLLECT' | 'VERIFIED' | 'RESPONDER_INPUT';
  limitOneResponse?: boolean;
  isQuiz?: boolean;
  confirmationMessage?: string;
}

export class GoogleFormsOAuthClient {
  private oauth2Client: OAuth2Client;
  private forms;

  constructor() {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';
    console.log('[GoogleFormsOAuth] Initializing with Redirect URI:', redirectUri);

    // Initialize OAuth2 Client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
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

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      redirect_uri: redirectUri // Explicitly include it to avoid "Missing required parameter" errors
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

      questions.forEach((q, index) => {
        const item: any = {
          title: q.title,
          description: q.description,
        };

        if (q.type === 'section') {
          item.pageBreakItem = {};
        } else {
          item.questionItem = {
            question: {
              required: q.required || false,
              ...this.buildQuestionConfig(q)
            }
          };
        }

        requests.push({
          createItem: {
            item: item,
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

      // Add Settings (Email Collection, etc.)
      if (settings?.emailCollectionType || settings?.collectEmail !== undefined) {
        let collectionType = settings.emailCollectionType;
        
        // Map simplified collectEmail flag to API enum if type not specified
        if (!collectionType && settings.collectEmail !== undefined) {
          collectionType = settings.collectEmail ? 'VERIFIED' : 'DO_NOT_COLLECT';
        }

        if (collectionType) {
          requests.push({
            updateSettings: {
              settings: {
                emailCollectionType: collectionType
              },
              updateMask: 'emailCollectionType'
            }
          });
        }
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

      // 4. Link Google Spreadsheet via Apps Script
      let spreadsheetUrl: string | undefined;
      try {
        const linkResult = await this.linkSpreadsheet(formId, title);
        spreadsheetUrl = linkResult?.spreadsheetUrl;
      } catch (linkError) {
        console.warn('[GoogleFormsOAuth] Failed to link spreadsheet, but form was created:', linkError);
        // We don't throw here to ensure the user still gets the form URLs
      }

      return {
        formId,
        title: createResponse.data.info?.title,
        url: createResponse.data.responderUri,
        editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
        spreadsheetUrl: spreadsheetUrl
      };

    } catch (error: any) {
      console.error('[GoogleFormsOAuth] Error creating form:', error);
      throw error;
    }
  }

  /**
   * Link a Google Spreadsheet to the form using an Apps Script Web App
   */
  private async linkSpreadsheet(formId: string, title: string) {
    const webAppUrl = process.env.GOOGLE_SCRIPT_WEB_APP_URL;
    if (!webAppUrl) {
      console.log('[GoogleFormsOAuth] GOOGLE_SCRIPT_WEB_APP_URL not set, skipping spreadsheet linking.');
      return;
    }

    try {
      console.log(`[GoogleFormsOAuth] Linking spreadsheet for form: ${formId}`);
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          formId, 
          title,
          validateEmails: true 
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[GoogleFormsOAuth] Spreadsheet linked successfully! URL: ${result.spreadsheetUrl}`);
        return result;
      } else {
        console.error('[GoogleFormsOAuth] Apps Script Error Details:', JSON.stringify(result.debug, null, 2));
        if (result.tip) console.warn('[GoogleFormsOAuth] Tip:', result.tip);
        throw new Error(result.error || 'Unknown Apps Script error');
      }
    } catch (error: any) {
      console.error('[GoogleFormsOAuth] Error calling Apps Script:', error.message);
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
      case 'text': {
        // Detect email field for logging
        const isEmailField = question.validation === 'email' || 
                             question.title.toLowerCase().includes('email') ||
                             question.title.toLowerCase().includes('e-mail');
        
        if (isEmailField) {
          console.log(`[GoogleFormsOAuth] Email field detected: "${question.title}"`);
        }
        
        return { textQuestion: { paragraph: false } };
      }


      
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
