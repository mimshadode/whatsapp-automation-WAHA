import 'dotenv/config';
import { createGoogleForm } from './lib/google_forms';

async function testSimple() {
  try {
    console.log('Testing simple form creation...');
    const result = await createGoogleForm({
      title: 'Simple Revert Test',
      questions: [{ title: 'Name', type: 'text' }]
    });
    console.log('Success:', result.url);
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}
testSimple();
