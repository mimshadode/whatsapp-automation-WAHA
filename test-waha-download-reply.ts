import dotenv from 'dotenv';
import { WAHAClient } from './lib/waha-client';
import fs from 'fs';
import path from 'path';

// Load .env.local file
dotenv.config({ path: '.env.local' });

async function testDownloadMediaByReplyId() {
  console.log('=== Testing WAHAClient.downloadMediaByReplyId ===\n');
  
  const waha = new WAHAClient();
  
  // Use the example from the user's request
  const replyId = '3EB0BABB98A6A5F01D7393';
  const mimetype = 'application/pdf';
  
  try {
    console.log(`Downloading media with ID: ${replyId}`);
    console.log(`Mimetype: ${mimetype}\n`);
    
    const result = await waha.downloadMediaByReplyId(replyId, mimetype);
    
    console.log(`Successfully downloaded media`);
    console.log(`Buffer size: ${result.buffer.length} bytes`);
    console.log(`Content type: ${result.mimeType}`);
    
    // Save to file for verification
    const outputPath = path.join(process.cwd(), 'test-reply-download.pdf');
    fs.writeFileSync(outputPath, result.buffer);
    console.log(`\nSaved to: ${outputPath}`);
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDownloadMediaByReplyId();
