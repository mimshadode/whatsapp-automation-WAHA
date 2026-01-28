import { BitlyClient } from './lib/bitly-client';
import * as dotenv from 'dotenv';
dotenv.config();

async function testBitly() {
  const bitly = new BitlyClient();
  const testUrl = 'https://google.com/search?q=testing+bitly+shortening';
  
  console.log('--- TESTING BITLY SHORTENING ---');
  console.log('Original URL:', testUrl);
  
  try {
    const shortUrl = await bitly.shorten(testUrl);
    console.log('Shortened URL:', shortUrl);
    
    if (shortUrl.includes('bit.ly')) {
      console.log('✅ BITLY SHORTENING SUCCESSFUL!');
    } else {
      console.log('❌ BITLY SHORTENING FAILED (Returned original URL)');
      console.log('Please check your BITLY_ACCESS_TOKEN in .env');
    }
  } catch (error) {
    console.error('❌ ERROR DURING TEST:', error);
  }
}

testBitly();
