import axios from 'axios';

/**
 * TinyURL Client
 * 
 * Manages URL shortening via TinyURL API.
 * Benefits over Bitly free tier:
 * - Direct 301 redirects (no preview/interstitial page)
 * - Custom aliases supported
 * - Free tier with generous limits
 */
export class TinyURLClient {
  private apiKey: string;
  private baseUrl = 'https://api.tinyurl.com';

  constructor() {
    this.apiKey = process.env.TINYURL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[TinyURLClient] TINYURL_API_KEY is not set. URL shortening will return original URLs.');
    }
  }

  /**
   * Shorten a URL with optional custom alias
   * @param longUrl - The URL to shorten
   * @param alias - Optional custom alias (e.g., "form-pendaftaran")
   * @returns Shortened URL or original URL if error
   */
  async shorten(longUrl: string, alias?: string): Promise<string> {
    if (!this.apiKey) {
      console.warn('[TinyURLClient] No API key configured, returning original URL');
      return longUrl;
    }

    try {
      const payload: any = {
        url: longUrl,
        domain: 'tinyurl.com'
      };

      // Add custom alias if provided
      if (alias && alias.trim().length > 0) {
        // Clean alias: remove special chars, spaces, and make it URL-safe
        const cleanAlias = alias
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        if (cleanAlias.length > 0) {
          payload.alias = cleanAlias;
          console.log(`[TinyURLClient] Requesting custom alias: ${cleanAlias}`);
        }
      }

      console.log(`[TinyURLClient] Shortening URL: ${longUrl.substring(0, 50)}...`);

      const response = await axios.post(
        `${this.baseUrl}/create`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data && response.data.data.tiny_url) {
        const shortUrl = response.data.data.tiny_url;
        console.log(`[TinyURLClient] Success: ${shortUrl}`);
        return shortUrl;
      }

      console.warn('[TinyURLClient] Unexpected response format, returning original URL');
      return longUrl;

    } catch (error: any) {
      const errorData = error.response?.data;
      
      // Handle alias already taken error
      if (errorData && errorData.errors) {
        const aliasError = errorData.errors.find((e: any) => 
          e.includes('alias') || e.includes('already') || e.includes('taken')
        );
        
        if (aliasError && alias) {
          // Retry with a random suffix
          const suffix = Math.floor(100 + Math.random() * 900);
          const fallbackAlias = `${alias}-${suffix}`;
          console.log(`[TinyURLClient] Alias taken, retrying with: ${fallbackAlias}`);
          
          try {
            const fallbackResponse = await axios.post(
              `${this.baseUrl}/create`,
              {
                url: longUrl,
                domain: 'tinyurl.com',
                alias: fallbackAlias
              },
              {
                headers: {
                  'Authorization': `Bearer ${this.apiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (fallbackResponse.data?.data?.tiny_url) {
              console.log(`[TinyURLClient] Success with fallback: ${fallbackResponse.data.data.tiny_url}`);
              return fallbackResponse.data.data.tiny_url;
            }
          } catch (fallbackError) {
            console.error('[TinyURLClient] Fallback also failed');
          }
        }
      }

      console.error('[TinyURLClient] Error shortening URL:', errorData || error.message);
      
      // Return original URL as fallback
      return longUrl;
    }
  }

  /**
   * Create a short URL without custom alias (random)
   * @param longUrl - The URL to shorten
   * @returns Shortened URL
   */
  async createShort(longUrl: string): Promise<string> {
    return this.shorten(longUrl);
  }
}
