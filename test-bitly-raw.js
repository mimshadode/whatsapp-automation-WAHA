const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function testBitly() {
  const accessToken = process.env.BITLY_ACCESS_TOKEN;
  const testUrl = 'https://google.com/search?q=testing+bitly+logic';
  
  console.log('--- TESTING BITLY API DIRECTLY ---');
  if (!accessToken) {
    console.error('❌ BITLY_ACCESS_TOKEN is not set in .env');
    return;
  }

  console.log('Original URL:', testUrl);
  
  try {
    // STEP 1: SHORTEN
    console.log('--- STEP 1: SHORTEN ---');
    const shortenResponse = await axios.post(
      'https://api-ssl.bitly.com/v4/shorten',
      { long_url: testUrl },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!shortenResponse.data || !shortenResponse.data.link) {
      throw new Error('Shorten failed');
    }

    const bitlinkId = shortenResponse.data.link.replace(/^https?:\/\//, '');
    console.log('Shortened ID:', bitlinkId);

    // STEP 2: CUSTOMIZE
    console.log('--- STEP 2: CUSTOMIZE ---');
    const customSlug = `test-api-${Date.now().toString().slice(-5)}`;
    const customBitlink = `bit.ly/${customSlug}`;
    console.log('Applying alias:', customBitlink);

    const customResponse = await axios.post(
      'https://api-ssl.bitly.com/v4/custom_bitlinks',
      {
        bitlink_id: bitlinkId,
        custom_bitlink: customBitlink
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (customResponse.data && customResponse.data.custom_bitlink) {
      console.log('✅ CUSTOM BITLINK SUCCESSFUL:', customResponse.data.custom_bitlink);
    }
  } catch (error) {
    console.error('❌ ERROR DURING TEST:', error.response?.data || error.message);
  }
}

testBitly();
