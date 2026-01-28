import { BitlyClient } from './lib/bitly-client';
import * as dotenv from 'dotenv';
dotenv.config();

async function testBitly2Step() {
  const bitly = new BitlyClient();
  const testUrl = `https://google.com/search?q=test-${Date.now()}`;
  const customSlug = `test-api-${Math.floor(Math.random() * 1000)}`;
  
  console.log('--- TESTING BITLY 2-STEP CUSTOM LINK ---');
  console.log('Original URL:', testUrl);
  console.log('Desired Slug:', customSlug);
  
  try {
    const shortUrl = await bitly.createCustomBitlink(testUrl, customSlug);
    console.log('Resulting URL:', shortUrl);
    
    if (shortUrl.includes(customSlug)) {
      console.log('✅ CUSTOM BITLINK SUCCESSFUL!');
    } else if (shortUrl.includes('bit.ly/')) {
      console.log('⚠️ CUSTOM BITLINK FAILED BUT SHORT LINK CREATED (Random/Fallback)');
    } else {
      console.log('❌ BITLY FAILED COMPLETELY');
    }
  } catch (error) {
    console.error('❌ ERROR DURING TEST:', error);
  }
}

testBitly2Step();
