
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// URL from your previous log (or update with a known working ID)
const MEDIA_ID = '3EB0BFDED81ACB54C272AA'; 
const WAHA_API_URL = 'http://localhost:5000';
const API_KEY = '0f1989b27ec64181b10f1af89376fd91';

// Construct the URL exactly as we expect it to work
const downloadUrl = `${WAHA_API_URL}/api/files/default/${MEDIA_ID}.pdf`;

console.log(`Testing download from: ${downloadUrl}`);

async function testDownload() {
  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'X-Api-Key': API_KEY,
        'Accept': '*/*'
      }
    });

    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers);
    console.log(`Data length: ${response.data.length} bytes`);
    
    fs.writeFileSync(path.join(process.cwd(), 'downloaded_test.pdf'), response.data);
    console.log('File saved successfully to downloaded_test.pdf');
    
  } catch (error: any) {
    console.error('Download failed!');
    if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Headers:', error.response?.headers);
        if (error.response?.data) {
             const dataStr = Buffer.from(error.response.data as any).toString('utf8');
             console.error('Body:', dataStr.substring(0, 200));
        }
    } else {
        console.error(error);
    }
  }
}

testDownload();
