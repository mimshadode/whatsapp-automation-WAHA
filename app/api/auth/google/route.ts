import { NextRequest, NextResponse } from 'next/server';
import { GoogleFormsOAuthClient } from '@/lib/google-forms-oauth-client';

export const dynamic = 'force-dynamic';

/**
 * Step 1: Redirect user to Google OAuth consent screen
 * Visit: http://localhost:3001/api/auth/google
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[OAuth] Starting auth flow...');
    console.log('[OAuth] Config Check:', {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT_SET_USING_DEFAULT',
    });

    const client = new GoogleFormsOAuthClient();
    const authUrl = client.getAuthUrl();
    
    console.log('[OAuth] Generated URL:', authUrl);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[OAuth] Error generating auth URL:', error);
    return NextResponse.json({ 
      error: error.message,
      env_check: {
        has_redirect_uri: !!process.env.GOOGLE_REDIRECT_URI
      }
    }, { status: 500 });
  }
}
