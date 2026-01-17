// Test script untuk dynamic form creation via AI
import 'dotenv/config';
import { GoogleFormCreatorTool } from './lib/ai/tools/google-form-creator';

async function testDynamicFormCreation() {
  console.log('=== Testing Dynamic Form Creation ===\n');
  
  const tool = new GoogleFormCreatorTool();
  
  // Test cases dengan berbagai request
  const testCases = [
    {
      name: 'Simple Registration Form',
      query: 'Buatkan form pendaftaran event dengan nama, email, dan pilih sesi (pagi/siang/malam)'
    },
    {
      name: 'Survey with Rating',
      query: 'Form survey kepuasan pelanggan dengan rating 1-5 dan kolom saran'
    },
    {
      name: 'Complex Form',
      query: 'Buatkan form lamaran kerja dengan: nama lengkap, email, nomor telepon, alamat lengkap, pilih posisi (Frontend/Backend/Fullstack/DevOps), pengalaman kerja (dropdown: 0-1 tahun, 1-3 tahun, 3-5 tahun, 5+ tahun), tanggal lahir, dan motivasi (paragraf panjang)'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('='.repeat(60));
    
    try {
      const result = await tool.execute(testCase.query, {
        phoneNumber: 'test@test.com',
        sessionState: {}
      });
      
      if (result.success) {
        console.log('\n✅ SUCCESS!');
        console.log('\nBot Reply:');
        console.log(result.reply);
        
        if (result.newState) {
          console.log('\nForm Details:');
          console.log('- Form ID:', result.newState.lastFormId);
          console.log('- Form URL:', result.newState.lastFormUrl);
          console.log('- Edit URL:', result.newState.lastFormEditUrl);
        }
      } else {
        console.log('\n❌ FAILED');
        console.log('Reply:', result.reply);
      }
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error('\n❌ ERROR:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Testing Complete!');
  console.log('='.repeat(60));
}

testDynamicFormCreation();
