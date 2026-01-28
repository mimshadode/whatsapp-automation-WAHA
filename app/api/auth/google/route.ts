import { NextRequest, NextResponse } from 'next/server';
import { GoogleFormsOAuthClient } from '@/lib/google-forms-oauth-client';

export const dynamic = 'force-dynamic';

/**
 * Step 1: Redirect user to Google OAuth consent screen
 * Visit: http://localhost:3001/api/auth/google
 */
export async function GET(req: NextRequest) {
  try {
    const client = new GoogleFormsOAuthClient();
    const authUrl = client.getAuthUrl();
    
    console.log('[OAuth] Redirecting to Google auth URL:', authUrl);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[OAuth] Error generating auth URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
