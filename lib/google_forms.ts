import { google } from 'googleapis';

export async function createGoogleForm(params: { title: string; questions: any[] }) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newline in env var
      },
      scopes: [
        'https://www.googleapis.com/auth/forms.body',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const forms = google.forms({ version: 'v1', auth });

    // 1. Create a blank form
    const createResponse = await forms.forms.create({
      requestBody: {
        info: {
          title: params.title,
        },
      },
    });

    const formId = createResponse.data.formId;
    if (!formId) throw new Error('Failed to create form ID');

    // 2. Add questions (Batch Update)
    const requests = params.questions.map((q, index) => {
      // Mapping simple types to Google Forms API types
      // Bisa diperluas jenis pertanyaannya (radio, checkbox, dll)
      let questionItem_question = {};
      
      if (q.type === 'choice' || q.type === 'radio') {
          questionItem_question = {
              choiceQuestion: {
                  type: 'RADIO',
                  options: (q.options || []).map((opt: string) => ({ value: opt }))
              }
          }
      } else {
           // Default to Text / Paragraph
          questionItem_question = {
              textQuestion: {
                  paragraph: false // Short answer
              }
          }
      }

      return {
        createItem: {
          item: {
            title: q.title,
            questionItem: {
              question: questionItem_question
            },
          },
          location: {
            index: index,
          },
        },
      };
    });

    if (requests.length > 0) {
      await forms.forms.batchUpdate({
        formId: formId,
        requestBody: {
          requests: requests,
        },
      });
    }

    return {
      title: createResponse.data.info?.title,
      url: createResponse.data.responderUri,
      editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
    };
  } catch (error) {
    console.error('[Google Forms] Error creating form:', error);
    throw error;
  }
}
