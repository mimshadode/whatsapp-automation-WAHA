// Test script untuk form dengan deskripsi
import 'dotenv/config';
import { GoogleFormCreatorTool } from './lib/ai/tools/google-form-creator';

async function testFormWithDescription() {
  console.log('=== Testing Form with Description ===\n');
  
  const tool = new GoogleFormCreatorTool();
  
  const testQuery = 'Buatkan formulir pendaftaran makan kerupuk tingkat desa sertakan deskripsi "ini adalah lomba menyenangkan"';
  
  console.log('Query:', testQuery);
  console.log('');
  
  try {
    const result = await tool.execute(testQuery, {
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
        console.log('\n📝 Buka Edit URL untuk verify bahwa deskripsi sudah ditambahkan!');
      }
    } else {
      console.log('\n❌ FAILED');
      console.log('Reply:', result.reply);
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testFormWithDescription();
