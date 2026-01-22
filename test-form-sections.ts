import 'dotenv/config';
import { GoogleFormsClient } from './lib/google-forms-client';

async function testFormWithSections() {
  console.log('=== Testing Google Forms with Sections & Descriptions ===\n');
  
  try {
    const client = new GoogleFormsClient();
    
    const questions: any[] = [
      {
        title: 'Bagian 1: Informasi Dasar',
        type: 'section',
        description: 'Silakan isi identitas Anda di bagian ini.'
      },
      {
        title: 'Nama Lengkap',
        type: 'text',
        required: true
      },
      {
        title: 'Email',
        type: 'text',
        required: true
      },
      {
        title: 'Bagian 2: Pengalaman',
        type: 'section',
        description: 'Ceritakan sedikit tentang pengalaman Anda.'
      },
      {
        title: 'Berapa tahun pengalaman Anda?',
        type: 'text',
        required: true
      },
      {
        title: 'Saran untuk kami',
        type: 'paragraph',
        required: false
      }
    ];
    
    console.log('Creating form with sections...');
    
    // Note: GoogleFormsClient.createForm params: (title, questions, description)
    const result = await client.createForm(
      'Form Test Sections - ' + new Date().toLocaleTimeString(), 
      questions,
      'Ini adalah form contoh yang dibuat secara otomatis dengan deskripsi dan pembatas halaman (section).'
    );
    
    console.log('\n✅ SUCCESS!');
    console.log('URL:', result.url);
    console.log('Edit URL:', result.editUrl);
    
  } catch (error: any) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  }
}

testFormWithSections();
