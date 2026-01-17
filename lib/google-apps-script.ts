import axios from 'axios';

export class GoogleAppsScriptClient {
  private scriptUrl: string;

  constructor() {
    this.scriptUrl = process.env.GOOGLE_SCRIPT_URL || '';
  }

  async createFormAndSheet(params: {
    title: string;
    description?: string;
    questions: any[];
  }) {
    if (!this.scriptUrl) {
      throw new Error('GOOGLE_SCRIPT_URL is not configured in .env');
    }

    try {
      console.log('[GAS Client] Requesting form/sheet creation from:', this.scriptUrl);
      
      const response = await axios.post(this.scriptUrl, params, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Unknown error from Google Apps Script');
      }

      return {
        formId: response.data.formId,
        title: response.data.title || params.title,
        url: response.data.formUrl,
        editUrl: response.data.editUrl,
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetUrl: response.data.spreadsheetUrl,
      };
    } catch (error: any) {
      console.error('[GAS Client] Error calling Google Apps Script:', error.message);
      throw error;
    }
  }
}
