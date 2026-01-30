import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Download QR Code
 * 
 * This endpoint fetches a QR code image from QRServer.com and serves it
 * with Content-Disposition: attachment to force browser download.
 * 
 * Usage: /api/qr/download?url=<bitly-link>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Generate QR code URL using QRServer.com
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;

    // Fetch the QR code image
    const imageResponse = await fetch(qrImageUrl);
    
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to generate QR code' },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Extract filename from URL or use default
    const urlObject = new URL(targetUrl);
    const filename = `QR-${urlObject.pathname.split('/').pop() || 'code'}.png`;

    // Return image with download headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error: any) {
    console.error('[QR Download API] Error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
