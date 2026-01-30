/**
 * Utility for generating QR code URLs
 * Centralizes QR code generation logic
 */
export class QRCodeGenerator {
  /**
   * Generate a downloadable QR code URL for a given link
   * Uses local API proxy to ensure auto-download on click
   * 
   * @param url - The URL to encode in the QR code
   * @returns URL that generates and downloads QR code image
   */
  static generateQRCodeURL(url: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/api/qr/download?url=${encodeURIComponent(url)}`;
  }
}
