
import { google } from 'googleapis';
import { GoogleFormsOAuthClient } from './lib/google-forms-oauth-client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkForm() {
  const formId = '1jnp-7nrTfXpJCciBl06rJswiT_uaRs9DMD8gxqz8nX4'; // ID from logs
  
  try {
    const client = new GoogleFormsOAuthClient();
    const form = await client.getForm(formId);
    
    console.log('=== FORM STRUCTURE ===');
    console.log(`Title: ${form.info?.title || 'No Title'}`);
    console.log(`ID: ${form.formId}`);
    console.log(`Items count: ${form.items ? form.items.length : 0}`);
    
    if (form.items) {
      form.items.forEach((item: any, index: number) => {
        let type = 'Unknown';
        if (item.questionItem) type = 'Question';
        if (item.pageBreakItem) type = 'SECTION BREAK';
        if (item.textItem) type = 'Text Description';
        
        console.log(`\nItem ${index + 1}: [${type}]`);
        console.log(`Title: ${item.title || '(No title)'}`);
        
        if (item.questionItem) {
            console.log(`Question Type: ${JSON.stringify(item.questionItem.question)}`);
        }
      });
    }
    
  } catch (error: any) {
    console.error('Error fetching form:', error);
  }
}

checkForm();
