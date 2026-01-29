import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
        return new NextResponse('Missing QR Code data', { status: 400 });
    }

    // Fetch QR code image from QR Server API
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(id)}`;
    
    const qrResponse = await axios.get(qrImageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000
    });
    
    return new NextResponse(qrResponse.data, {
        status: 200,
        headers: {
            'Content-Type': qrResponse.headers['content-type'] || 'image/png',
            'Cache-Control': 'public, max-age=86400, immutable',
        }
    });

  } catch (error: any) {
    console.error('[QR Proxy] Error fetching QR code:', error.message);
    return new NextResponse('Failed to generate QR code', { status: 500 });
  }
}
