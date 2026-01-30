import { NextResponse } from 'next/server';
import { FormsDB } from '@/lib/forms-db';
import { TinyURLClient } from '@/lib/tinyurl-client';

// Handler for /api/forms/[id]/tinyurl
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; 
  try {
    const body = await req.json();
    const { alias } = body; // The requested alias (optional, if empty auto-generate or reuse)
    
    // 1. Get current form data
    const form = await FormsDB.getForm(id);
    if (!form) return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    
    const tinyUrlClient = new TinyURLClient();
    
    // 2. Shorten URL
    // Use the alias if provided, otherwise let TinyURL/helper generate it
    const longUrl = form.publishedUrl;
    
    // If alias is empty, maybe try to generate a smart one from title?
    // The frontend should probably provide the alias or handle auto-switch.
    // If alias is provided, use it.
    
    let result;
    if (alias) {
       result = await tinyUrlClient.shortenWithAlias(longUrl, alias);
    } else {
       // Fallback to auto generation using title if alias is missing?
       // Or just standard shortening.
       // Let's assume alias is required for this route if it's "Update Link".
       // But if it's "Create Link", maybe we auto-generate?
       // Let's imply alias is optional.
       result = await tinyUrlClient.shortestUrl(longUrl, form.title); // Uses smart generation
    }
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    
    // 3. Update DB
    const updatedForm = await FormsDB.updateTinyUrl(id, result.shortUrl!, result.alias || alias || 'auto');
    
    return NextResponse.json({ success: true, data: updatedForm });
    
  } catch (error: any) {
    console.error('TinyURL API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // We only remove from DB. We cannot "delete" a TinyURL alias via public API usually (only archive).
    // And TinyURL open API is limited.
    // So we just clear it from our DB.
    
    const updatedForm = await FormsDB.removeTinyUrl(id);
    return NextResponse.json({ success: true, data: updatedForm });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
