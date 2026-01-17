import { NextRequest, NextResponse } from 'next/server';
import { GoogleFormsOAuthClient } from '@/lib/google-forms-oauth-client';

export const dynamic = 'force-dynamic';

/**
 * Step 2: Handle OAuth callback from Google
 * This endpoint receives the authorization code and exchanges it for tokens
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('[OAuth Callback] Error from Google:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const client = new GoogleFormsOAuthClient();
    const tokens = await client.getTokensFromCode(code);

    console.log('[OAuth Callback] Successfully obtained tokens');
    console.log('Access Token:', tokens.access_token?.substring(0, 20) + '...');
    console.log('Refresh Token:', tokens.refresh_token?.substring(0, 20) + '...');

    // Return HTML page with instructions to save tokens
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #4285f4; }
            .success { color: #0f9d58; }
            .token-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              margin: 10px 0;
              font-family: monospace;
              word-break: break-all;
            }
            .label {
              font-weight: bold;
              color: #5f6368;
              margin-bottom: 5px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ OAuth Authorization Successful!</h1>
            <p class="success">Your Google account has been successfully authorized.</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> Save these tokens to your <code>.env.local</code> file
            </div>

            <div class="label">GOOGLE_CLIENT_ID</div>
            <div class="token-box">${process.env.GOOGLE_CLIENT_ID || 'Already set'}</div>

            <div class="label">GOOGLE_CLIENT_SECRET</div>
            <div class="token-box">${process.env.GOOGLE_CLIENT_SECRET || 'Already set'}</div>

            <div class="label">GOOGLE_REFRESH_TOKEN (⭐ SAVE THIS!)</div>
            <div class="token-box">${tokens.refresh_token || 'Not provided - you may need to revoke access and try again'}</div>

            <div class="label">GOOGLE_ACCESS_TOKEN (Optional - will auto-refresh)</div>
            <div class="token-box">${tokens.access_token?.substring(0, 50)}...</div>

            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the <strong>GOOGLE_REFRESH_TOKEN</strong> above</li>
              <li>Add it to your <code>.env.local</code> file:
                <div class="token-box">GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"</div>
              </li>
              <li>Restart your Next.js server</li>
              <li>Test form creation with: <code>npx tsx test-google-forms-oauth.ts</code></li>
            </ol>

            <p><a href="/">← Back to Home</a></p>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('[OAuth Callback] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
}
