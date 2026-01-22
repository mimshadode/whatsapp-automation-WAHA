import 'dotenv/config';
import { GoogleFormsOAuthClient } from './lib/google-forms-oauth-client';

async function testEmailCollection() {
  console.log('=== Testing Google Forms Email Collection Settings ===\n');
  
  try {
    const client = new GoogleFormsOAuthClient();
    
    // Test case 1: VERIFIED email collection
    console.log('Test 1: Creating form with VERIFIED email collection...');
    const result1 = await client.createForm(
      'Email Collection Test (VERIFIED) - ' + new Date().toLocaleTimeString(),
      [{ title: 'What is your name?', type: 'text' }],
      { emailCollectionType: 'VERIFIED' }
    );
    console.log('✅ Success! Form 1 URL:', result1.url);
    console.log('Edit URL 1:', result1.editUrl);

    // Test case 2: RESPONDER_INPUT email collection
    console.log('\nTest 2: Creating form with RESPONDER_INPUT email collection...');
    const result2 = await client.createForm(
      'Email Collection Test (RESPONDER_INPUT) - ' + new Date().toLocaleTimeString(),
      [{ title: 'What is your name?', type: 'text' }],
      { emailCollectionType: 'RESPONDER_INPUT' }
    );
    console.log('✅ Success! Form 2 URL:', result2.url);
    console.log('Edit URL 2:', result2.editUrl);

  } catch (error: any) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  }
}

testEmailCollection();
