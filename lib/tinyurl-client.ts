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
        let cleanAlias = alias
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        // TinyURL limit: 30 characters max
        if (cleanAlias.length > 30) {
          cleanAlias = cleanAlias.substring(0, 30).replace(/-$/, '');
          console.log(`[TinyURLClient] Alias truncated to 30 chars: ${cleanAlias}`);
        }
        
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
      
      // Handle alias conflict errors
      if (errorData && errorData.code === 5) {
        const errorMessage = errorData.errors?.[0] || '';
        
        // Check if error is about alias availability or length
        const isAliasUnavailable = errorMessage.includes('not available') || 
                                   errorMessage.includes('already') || 
                                   errorMessage.includes('taken');
        
        const isAliasTooLong = errorMessage.includes('greater than 30');
        
        if (isAliasUnavailable && alias) {
          // Generate unique suffix using timestamp
          const timestamp = Date.now().toString().slice(-6); // Last 6 digits
          const baseAlias = alias.length > 23 ? alias.substring(0, 23) : alias; // Reserve 7 chars for suffix
          const fallbackAlias = `${baseAlias}-${timestamp}`;
          
          console.log(`[TinyURLClient] Alias unavailable, retrying with unique suffix: ${fallbackAlias}`);
          
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
          } catch (fallbackError: any) {
            console.error('[TinyURLClient] Fallback also failed:', fallbackError.response?.data || fallbackError.message);
          }
        } else if (isAliasTooLong) {
          console.error('[TinyURLClient] Alias too long even after truncation. This should not happen.');
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
