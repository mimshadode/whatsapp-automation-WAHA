import 'dotenv/config';
import { MediaParserService } from './lib/media-parser-service';
import * as fs from 'fs';
import * as path from 'path';

async function testMediaParser() {
  console.log('=== Testing MediaParserService ===\n');
  
  const parser = new MediaParserService();
  
  // Test with an image URL if possible, or skip OCR test if no local file
  const testImageUrl = 'https://raw.githubusercontent.com/naptha/tesseract.js/master/tests/assets/images/cosmic.png';
  
  try {
    console.log(`Test 1: OCR from URL (${testImageUrl})...`);
    const text = await parser.extractTextFromImage(testImageUrl);
    console.log('✅ OCR Success! Extracted text samples:');
    console.log('------------------------------------------');
    console.log(text.substring(0, 200));
    console.log('------------------------------------------');

    // Test PDF if we had a local sample... 
    // For now, URL test is enough to verify Tesseract and Sharp are working.
  } catch (error: any) {
    console.error('❌ Error during test:', error.message);
  }
}

testMediaParser();
