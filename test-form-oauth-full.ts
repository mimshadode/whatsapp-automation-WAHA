import 'dotenv/config';
import { GoogleFormsOAuthClient, FormQuestion } from './lib/google-forms-oauth-client';

async function testFullOAuth() {
  console.log('=== Testing Google Forms OAuth - Sections & Descriptions ===\n');
  
  try {
    const client = new GoogleFormsOAuthClient();
    
    const questions: FormQuestion[] = [
      {
        title: 'Bagian Pertama',
        type: 'section',
        description: 'Ini adalah bagian pertama dari form.'
      },
      {
        title: 'Siapa nama Anda?',
        type: 'text',
        required: true
      },
      {
        title: 'Bagian Kedua',
        type: 'section',
        description: 'Lanjutkan ke bagian kedua.'
      },
      {
        title: 'Apa hobi Anda?',
        type: 'paragraph'
      }
    ];
    
    console.log('Creating form with OAuth...');
    
    // createForm(title, questions, settings)
    const result = await client.createForm(
      'OAuth Section Test - ' + new Date().toLocaleTimeString(),
      questions,
      { description: 'Deskripsi form utama menggunakan OAuth.' }
    );
    
    console.log('\n✅ SUCCESS!');
    console.log('Form ID:', result.formId);
    console.log('URL:', result.url);
    console.log('Edit URL:', result.editUrl);
    
  } catch (error: any) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  }
}

testFullOAuth();
