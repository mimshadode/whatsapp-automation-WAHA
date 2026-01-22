import 'dotenv/config';
import { GoogleFormsClient } from './lib/google-forms-client';

async function testSectionOnly() {
  const client = new GoogleFormsClient();
  try {
    console.log('Testing form with pageBreakItem (section)...');
    const result = await client.createForm(
      'Section Test',
      [
        { title: 'Section 1', type: 'section' },
        { title: 'Question 1', type: 'text' }
      ]
    );
    console.log('Success:', result.url);
  } catch (e: any) {
    console.error('Failed:', e.message);
    if (e.response?.data) console.error('Data:', JSON.stringify(e.response.data, null, 2));
  }
}
testSectionOnly();
