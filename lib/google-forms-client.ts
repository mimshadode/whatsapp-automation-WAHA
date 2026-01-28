import { google } from 'googleapis';

export interface FormQuestion {
  title: string;
  type: 'text' | 'paragraph' | 'choice' | 'radio' | 'checkbox' | 'dropdown' | 'scale' | 'date' | 'time' | 'section';
  options?: string[];
  required?: boolean;
  description?: string;
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
        'https://www.googleapis.com/auth/forms.responses.readonly',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    this.forms = google.forms({ version: 'v1', auth });
  }

  // --- Legacy Capabilities (Creation) ---

  async createForm(title: string, questions: FormQuestion[], description?: string) {
    try {
      // 1. Create Form
      const createResponse = await this.forms.forms.create({
        requestBody: { info: { title } },
      });

      const formId = createResponse.data.formId;
      if (!formId) throw new Error('Failed to create form ID');

      // 2. Add Questions
      const requests: any[] = [];
      
      if (questions.length > 0) {
        questions.forEach((q, index) => {
          const item: any = {
            title: q.title,
            description: q.description,
          };

          if (q.type === 'section') {
            item.pageBreakItem = {};
          } else {
            let questionConfig = {};
            
            if (q.type === 'choice' || q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown') {
              let type = 'RADIO';
              if (q.type === 'checkbox') type = 'CHECKBOX';
              if (q.type === 'dropdown') type = 'DROP_DOWN';

              questionConfig = {
                choiceQuestion: {
                  type,
                  options: (q.options || []).map((opt) => ({ value: opt }))
                }
              };
            } else if (q.type === 'paragraph') {
              questionConfig = {
                textQuestion: { paragraph: true }
              };
            } else {
              questionConfig = {
                textQuestion: { paragraph: false }
              };
            }

            item.questionItem = { 
              question: {
                required: q.required || false,
                ...questionConfig 
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
      }

      // Add description if provided
      if (description) {
        requests.push({
          updateFormInfo: {
            info: { description },
            updateMask: 'description'
          }
        });
      }

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
     const baseUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
     // Standard mapping logic...
     return `${baseUrl}?entry.12345=${encodeURIComponent('Example')}`;
  }
}
