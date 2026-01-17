// Test script untuk Google Forms API dengan dotenv
import 'dotenv/config';
import { GoogleFormsClient } from './lib/google-forms-client';

async function testFormCreation() {
  console.log('=== Testing Google Forms Creation ===\n');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓ SET' : '✗ NOT SET');
  console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? `✓ SET (${process.env.GOOGLE_PRIVATE_KEY.length} chars)` : '✗ NOT SET');
  console.log('');
  
  try {
    const client = new GoogleFormsClient();
    console.log('✓ GoogleFormsClient initialized');
    
    const testQuestions = [
      {
        title: 'Nama Lengkap',
        type: 'text' as const
      },
      {
        title: 'Email',
        type: 'text' as const
      },
      {
        title: 'Pilih Sesi',
        type: 'radio' as const,
        options: ['Pagi', 'Siang', 'Malam']
      }
    ];
    
    console.log('\nCreating form with questions:', JSON.stringify(testQuestions, null, 2));
    
    const result = await client.createForm('Test Form - ' + new Date().toISOString(), testQuestions);
    
    console.log('\n✅ SUCCESS! Form created:');
    console.log('Form ID:', result.formId);
    console.log('Title:', result.title);
    console.log('URL:', result.url);
    console.log('Edit URL:', result.editUrl);
    
  } catch (error: any) {
    console.error('\n❌ ERROR creating form:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('\nAPI Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFormCreation();
