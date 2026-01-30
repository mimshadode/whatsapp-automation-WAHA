import { NextResponse } from 'next/server';
import { FormsDB } from '@/lib/forms-db';
import { GoogleFormsOAuthClient } from '@/lib/google-forms-oauth-client';

export async function GET() {
  try {
    const forms = await FormsDB.listForms();
    return NextResponse.json({ success: true, data: forms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Sync forms from Drive
    const client = new GoogleFormsOAuthClient();
    
    // 1. Fetch recent forms from Drive
    const files = await client.listForms(20); // Limit to top 20 recent
    
    // 2. Sync each to DB
    const results = [];
    for (const file of files) {
      if (!file.id || !file.name) continue;
      
      const formSyncData = {
        id: file.id,
        title: file.name,
        description: (file as any).description || null, // Might be empty from Drive list
        publishedUrl: `https://docs.google.com/forms/d/e/${file.id}/viewform`, // Standard view URL approximation (might need verification)
        // Actually, reliable published URL usually requires getForm().
        // For efficiency, we can assume standard format or fetch details individually if needed.
        // Let's use the standard "edit" URL which is definitely file.id based.
        // Published URL technically varies (viewform) but let's try to construct it.
        // EDIT: Google Forms ID for viewform is OFTEN different (long hash vs short ID).
        // BUT for standard forms, /d/ID/viewform usually redirects or works.
        // SAFEST: /d/ID/edit is the edit url.
        editUrl: `https://docs.google.com/forms/d/${file.id}/edit`,
        publishedUrl: `https://docs.google.com/forms/d/${file.id}/viewform` 
      };
      
      const saved = await FormsDB.syncForm(formSyncData);
      results.push(saved);
    }
    
    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
