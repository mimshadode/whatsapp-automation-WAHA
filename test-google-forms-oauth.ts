// Test script untuk Google Forms OAuth Client
import 'dotenv/config';
import { GoogleFormsOAuthClient } from './lib/google-forms-oauth-client';

async function testOAuthFormCreation() {
  console.log('=== Testing Google Forms OAuth Client ===\n');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ SET' : '✗ NOT SET');
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ SET' : '✗ NOT SET');
  console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? '✓ SET' : '✗ NOT SET');
  console.log('');

  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('❌ GOOGLE_REFRESH_TOKEN not set!');
    console.log('\nTo get your refresh token:');
    console.log('1. Start your Next.js server: npm run dev');
    console.log('2. Visit: http://localhost:3001/api/auth/google');
    console.log('3. Authorize with your Google account');
    console.log('4. Copy the GOOGLE_REFRESH_TOKEN from the callback page');
    console.log('5. Add it to your .env.local file');
    console.log('6. Run this test again\n');
    return;
  }
  
  try {
    const client = new GoogleFormsOAuthClient();
    console.log('✓ GoogleFormsOAuthClient initialized');
    
    const testQuestions = [
      {
        title: 'Nama Lengkap',
        type: 'text' as const,
        required: true
      },
      {
        title: 'Email',
        type: 'text' as const,
        required: true
      },
      {
        title: 'Pilih Sesi',
        type: 'radio' as const,
        options: ['Pagi (08:00-12:00)', 'Siang (13:00-17:00)', 'Malam (18:00-21:00)'],
        required: true
      },
      {
        title: 'Topik yang Diminati (pilih semua yang sesuai)',
        type: 'checkbox' as const,
        options: ['Web Development', 'Mobile Development', 'AI/ML', 'DevOps', 'Cloud Computing']
      },
      {
        title: 'Tingkat Pengalaman',
        type: 'dropdown' as const,
        options: ['Pemula', 'Menengah', 'Mahir', 'Expert']
      },
      {
        title: 'Seberapa tertarik Anda dengan topik ini?',
        type: 'scale' as const,
        low: 1,
        high: 5,
        lowLabel: 'Tidak Tertarik',
        highLabel: 'Sangat Tertarik'
      },
      {
        title: 'Tanggal Lahir',
        type: 'date' as const
      },
      {
        title: 'Catatan Tambahan',
        type: 'paragraph' as const
      }
    ];
    
    console.log('\nCreating form with', testQuestions.length, 'questions...');
    
    const result = await client.createForm(
      'Form Pendaftaran Event - ' + new Date().toISOString(), 
      testQuestions,
      {
        collectEmail: true,
        limitOneResponse: true
      }
    );
    
    console.log('\n✅ SUCCESS! Form created:');
    console.log('Form ID:', result.formId);
    console.log('Title:', result.title);
    console.log('Responder URL:', result.url);
    console.log('Edit URL:', result.editUrl);
    console.log('\nOpen the form in your browser to verify all question types!');
    
  } catch (error: any) {
    console.error('\n❌ ERROR creating form:');
    console.error('Message:', error.message);
    
    if (error.response) {
      console.error('\nAPI Response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Tip: Your refresh token may have expired.');
      console.log('Visit http://localhost:3001/api/auth/google to get a new one.');
    }
  }
}

testOAuthFormCreation();
