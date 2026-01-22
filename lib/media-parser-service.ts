// Dynamic import to avoid server-side initialization issues with Tesseract.js
// Tesseract.js requires browser APIs (like DOMMatrix) that are not available in Node.js server context

const PDFParser = require("pdf2json");
import mammoth from 'mammoth';
import axios from 'axios';
import sharp from 'sharp';

export class MediaParserService {
  /**
   * Mengambil teks dari gambar menggunakan Tesseract.js
   * @param imageSource Buffer atau URL gambar
   */
  async extractTextFromImage(imageSource: Buffer | string): Promise<string> {
    try {
      console.log('[MediaParser] Extracting text from image...');
      
      let input: Buffer;
      if (typeof imageSource === 'string') {
        const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
        input = Buffer.from(response.data);
      } else {
        input = imageSource;
      }

      // Pre-processing dengan sharp untuk meningkatkan akurasi OCR
      // Mengubah ke grayscale dan meningkatkan kontras
      const processedImage = await sharp(input)
        .grayscale()
        .normalize()
        .toBuffer();

      // Dynamic import to avoid server-side initialization issues
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(processedImage, 'ind+eng', {
        logger: (m: { status: string; progress: number }) => console.log(`[OCR Progress] ${m.status}: ${Math.round(m.progress * 100)}%`)
      });

      return result.data.text;
    } catch (error: any) {
      console.error('[MediaParser] OCR Error:', error.message);
      throw new Error(`Gagal mengekstrak teks dari gambar: ${error.message}`);
    }
  }

  /**
   * Mengambil teks dari PDF using pdf2json
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    console.log('[MediaParser] Extracting text from PDF using pdf2json...');
    
    return new Promise((resolve, reject) => {
        try {
            const pdfParser = new PDFParser(null, 1); // 1 = text content only
            
            pdfParser.on("pdfParser_dataError", (errData: any) => {
                 console.error('[MediaParser] PDF2JSON Error:', errData.parserError);
                 reject(new Error(`PDF Parse Error: ${errData.parserError}`));
            });
    
            pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                 try {
                     const text = pdfParser.getRawTextContent();
                     console.log(`[MediaParser] Extracted text length: ${text.length}`);
                     console.log(`[MediaParser] Preview: ${text.substring(0, 100)}...`);
                     resolve(text);
                 } catch (e: any) {
                     reject(e);
                 }
            });
    
            pdfParser.parseBuffer(pdfBuffer);
        } catch (e: any) {
             console.error('[MediaParser] Setup Error:', e.message);
             reject(e);
        }
    });
  }

  /**
   * Mengambil teks dari berkas Word (.docx)
   */
  async extractTextFromDocx(docxBuffer: Buffer): Promise<string> {
    try {
      console.log('[MediaParser] Extracting text from DOCX...');
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      return result.value;
    } catch (error: any) {
      console.error('[MediaParser] DOCX Parse Error:', error.message);
      throw new Error(`Gagal mengekstrak teks dari DOCX: ${error.message}`);
    }
  }

  /**
   * Mendeteksi format media dan mengekstrak teksnya
   */
  async parseMedia(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType.startsWith('image/')) {
      return this.extractTextFromImage(buffer);
    } else if (mimeType === 'application/pdf') {
      return this.extractTextFromPDF(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return this.extractTextFromDocx(buffer);
    } else {
      throw new Error(`Format file tidak didukung: ${mimeType}`);
    }
  }
}
