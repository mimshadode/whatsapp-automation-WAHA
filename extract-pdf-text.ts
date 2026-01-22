import 'dotenv/config';
import { MediaParserService } from './lib/media-parser-service';
import * as fs from 'fs';
import * as path from 'path';

async function extractPDFText() {
  const parser = new MediaParserService();
  const pdfPath = path.join(process.cwd(), 'downloaded_test.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    return;
  }

  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`Extracting text from ${pdfPath}...`);
    const text = await parser.extractTextFromPDF(pdfBuffer);
    
    console.log('\n--- EXTRACTED TEXT ---');
    console.log(text);
    console.log('--- END OF TEXT ---\n');
    
    fs.writeFileSync('extracted_text.txt', text);
    console.log('Saved extracted text to extracted_text.txt');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

extractPDFText();
