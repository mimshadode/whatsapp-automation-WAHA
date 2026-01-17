// Quick test untuk verify OAuth credentials
import 'dotenv/config';

console.log('=== OAuth Credentials Check ===\n');

console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || '❌ NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ SET' : '❌ NOT SET');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ NOT SET');
console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN || '(empty - will get after authorization)');

console.log('\n=== Validation ===\n');

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

// Validate Client ID format
if (clientId.includes('.apps.googleusercontent.com')) {
  console.log('✓ Client ID format looks correct');
} else {
  console.log('❌ Client ID format incorrect - should end with .apps.googleusercontent.com');
}

// Validate Client Secret format
if (clientSecret.startsWith('GOCSPX-')) {
  console.log('✓ Client Secret format looks correct');
} else {
  console.log('❌ Client Secret format incorrect - should start with GOCSPX-');
}

// Validate Redirect URI
if (redirectUri === 'http://localhost:3001/api/auth/google/callback') {
  console.log('✓ Redirect URI is correct');
} else {
  console.log('❌ Redirect URI incorrect');
  console.log('  Expected: http://localhost:3001/api/auth/google/callback');
  console.log('  Got:', redirectUri);
}

console.log('\n=== Next Steps ===\n');

if (clientId && clientSecret && redirectUri) {
  console.log('1. Make sure redirect URI is added in Google Cloud Console:');
  console.log('   - Go to https://console.cloud.google.com/apis/credentials');
  console.log('   - Click on your OAuth client (Web client 2)');
  console.log('   - Under "Authorized redirect URIs", add:');
  console.log('     http://localhost:3001/api/auth/google/callback');
  console.log('   - Click SAVE');
  console.log('');
  console.log('2. Restart your Next.js server (if running)');
  console.log('');
  console.log('3. Visit: http://localhost:3001/api/auth/google');
  console.log('');
  console.log('If you still get "invalid_client" error, wait 1-2 minutes');
  console.log('(OAuth client changes may take time to propagate)');
} else {
  console.log('❌ Please set all required OAuth credentials in .env file');
}
