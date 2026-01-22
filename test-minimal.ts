import 'dotenv/config';
import { GoogleFormsClient } from './lib/google-forms-client';

async function testMinimal() {
  const client = new GoogleFormsClient();
  try {
    console.log('Testing minimal form with description...');
    const result = await client.createForm(
      'Minimal Test',
      [{ title: 'Name', type: 'text' }],
      'Test Description'
    );
    console.log('Success:', result.url);
  } catch (e: any) {
    console.error('Failed:', e.message);
    if (e.response?.data) console.error('Data:', JSON.stringify(e.response.data, null, 2));
  }
}
testMinimal();
