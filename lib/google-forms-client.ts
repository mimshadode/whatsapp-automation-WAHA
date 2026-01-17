import { google } from 'googleapis';

export interface FormQuestion {
  title: string;
  type: 'text' | 'choice' | 'radio';
  options?: string[];
}

export class GoogleFormsClient {
  private forms;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/forms.body',
        'https://www.googleapis.com/auth/forms.responses.readonly', // Added for reading responses if needed
        'https://www.googleapis.com/auth/drive', // For file permissions
      ],
    });

    this.forms = google.forms({ version: 'v1', auth });
  }

  // --- Legacy Capabilities (Creation) ---

  async createForm(title: string, questions: FormQuestion[]) {
    try {
      // 1. Create Form
      const createResponse = await this.forms.forms.create({
        requestBody: { info: { title } },
      });

      const formId = createResponse.data.formId;
      if (!formId) throw new Error('Failed to create form ID');

      // 2. Add Questions
      if (questions.length > 0) {
        const requests = questions.map((q, index) => {
          let questionConfig = {};
          
          if (q.type === 'choice' || q.type === 'radio') {
            questionConfig = {
              choiceQuestion: {
                type: 'RADIO',
                options: (q.options || []).map((opt) => ({ value: opt }))
              }
            };
          } else {
            questionConfig = {
              textQuestion: { paragraph: false }
            };
          }

          return {
            createItem: {
              item: {
                title: q.title,
                questionItem: { question: questionConfig }
              },
              location: { index }
            }
          };
        });

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

    } catch (error) {
      console.error('[GoogleForms Client] Error creating form:', error);
      throw error;
    }
  }

  // --- New Capabilities (Filling/Submission) ---

  async getFormSchema(formId: string) {
    try {
      const response = await this.forms.forms.get({ formId });
      return response.data;
    } catch (error) {
      console.error('[GoogleForms Client] Error fetching schema:', error);
      throw error;
    }
  }

  async submitResponse(formId: string, answers: Record<string, string>) {
     // Note: Direct submission via API is limited. 
     // For robust submission, we usually use a prefill URL or Apps Script.
     // Implementing a prefill URL generator as a basic "submission" linkage for now.
     
     const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
     const params = new URLSearchParams();
     
     // In a real scenario, we'd need to map Field IDs (entry.12345) to answers.
     // Since we don't have the entry IDs mapping here without fetching schema detailed analysis,
     // we return a generic link or implement detailed mapping logic later.
     
     return `${baseUrl}?entry.12345=${encodeURIComponent('Example')}`;
  }
}
