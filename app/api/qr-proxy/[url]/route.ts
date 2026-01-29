import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

/**
 * QR Code Proxy Endpoint
 * Accepts encoded URL and redirects to QR Server API
 * 
 * Usage: /api/qr-proxy/aHR0cHM6Ly9iaXQubHkvYXlvLWdvLTM0NQ==
 * Where the parameter is base64-encoded URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url } = await params;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Decode base64 URL
    let decodedUrl: string;
    try {
      decodedUrl = Buffer.from(url, 'base64').toString('utf-8');
    } catch (decodeError) {
      return NextResponse.json(
        { error: 'Invalid base64 encoding' },
        { status: 400 }
      );
    }

    console.log('[QR Proxy] Decoded URL:', decodedUrl);

    // Generate QR code from decoded URL
    const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(decodedUrl)}`;

    console.log('[QR Proxy] Fetching QR from:', qrServerUrl);

    // Fetch the QR code image
    const qrResponse = await axios.get(qrServerUrl, {
      responseType: 'arraybuffer',
      timeout: 5000
    });

    // Return the image directly
    return new NextResponse(qrResponse.data, {
      status: 200,
      headers: {
        'Content-Type': qrResponse.headers['content-type'] || 'image/png',
        'Cache-Control': 'public, max-age=3600, immutable',
        'Content-Disposition': 'inline; filename="qrcode.png"',
      }
    });

  } catch (error: any) {
    console.error('[QR Proxy] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
