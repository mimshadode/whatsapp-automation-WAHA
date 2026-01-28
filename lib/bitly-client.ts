import axios from 'axios';

export class BitlyClient {
  private accessToken: string;
  private baseUrl = 'https://api-ssl.bitly.com/v4';

  private groupGuid: string | null = null;

  constructor() {
    this.accessToken = process.env.BITLY_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      console.warn('[BitlyClient] BITLY_ACCESS_TOKEN is not set. Shortening will be skipped.');
    }
  }

  /**
   * Get the primary group GUID for the user
   */
  private async getGroupGuid(): Promise<string | null> {
    if (this.groupGuid) return this.groupGuid;

    try {
      const response = await axios.get(`${this.baseUrl}/groups`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });

      if (response.data && response.data.groups && response.data.groups.length > 0) {
        this.groupGuid = response.data.groups[0].guid;
        console.log(`[BitlyClient] Found primary group GUID: ${this.groupGuid}`);
        return this.groupGuid;
      }
      return null;
    } catch (error: any) {
      console.error('[BitlyClient] Error fetching groups:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Shorten a long URL using Bitly API, optionally with a custom keyword
   */
  async shorten(longUrl: string, keyword?: string): Promise<string> {
    if (!this.accessToken) return longUrl;

    // Use specific endpoint for custom keywords if provided
    if (keyword) {
      return this.createCustomBitlink(longUrl, keyword);
    }

    try {
      console.log(`[BitlyClient] Shortening URL: ${longUrl}`);
      const response = await axios.post(
        `${this.baseUrl}/shorten`,
        { long_url: longUrl },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.link) {
        console.log(`[BitlyClient] Successfully shortened: ${response.data.link}`);
        return response.data.link;
      }

      return longUrl;
    } catch (error: any) {
      console.error('[BitlyClient] Error shortening URL:', error.response?.data || error.message);
      return longUrl;
    }
  }

  /**
   * Create a bitlink with a custom keyword
   * Uses 2-step process:
   * 1. Shorten bitlink to get a base bitlink_id
   * 2. Apply custom back-half via /custom_bitlinks
   */
  async createCustomBitlink(longUrl: string, keyword: string): Promise<string> {
    try {
      // 1. First get a standard bitlink
      const baseShortUrl = await this.shorten(longUrl);
      const bitlinkId = baseShortUrl.replace(/^https?:\/\//, ''); // e.g. bit.ly/3AbCdEf
      
      console.log(`[BitlyClient] Base bitlink ID: ${bitlinkId}. Applying custom alias: ${keyword}`);
      
      // Sanitasi keyword
      const cleanKeyword = keyword.replace(/bit\.ly\//, '').replace(/[^a-zA-Z0-9-_]/g, '');
      const customBitlink = `bit.ly/${cleanKeyword}`;

      try {
        const response = await axios.post(
          `${this.baseUrl}/custom_bitlinks`,
          {
            bitlink_id: bitlinkId,
            custom_bitlink: customBitlink
          },
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.custom_bitlink) {
          console.log(`[BitlyClient] Successfully created custom bitlink: ${response.data.custom_bitlink}`);
          return `https://${response.data.custom_bitlink}`;
        }
      } catch (customError: any) {
        const errorData = customError.response?.data;
        console.warn('[BitlyClient] Error applying custom alias:', errorData?.message || customError.message);
        
        // If keyword already exists, try with a random suffix as fallback
        if (errorData?.message === 'ALREADY_EXISTS' || errorData?.description?.includes('already in use')) {
          const suffix = Math.floor(100 + Math.random() * 900); // 3-digit number
          const fallbackKeyword = `${cleanKeyword}-${suffix}`;
          console.log(`[BitlyClient] Retrying with fallback keyword: ${fallbackKeyword}`);
          
          try {
            const fallbackResponse = await axios.post(
              `${this.baseUrl}/custom_bitlinks`,
              {
                bitlink_id: bitlinkId,
                custom_bitlink: `bit.ly/${fallbackKeyword}`
              },
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (fallbackResponse.data && fallbackResponse.data.custom_bitlink) {
              return `https://${fallbackResponse.data.custom_bitlink}`;
            }
          } catch (e) {
            console.error('[BitlyClient] Fallback also failed.');
          }
        }
      }

      return baseShortUrl;
    } catch (error: any) {
      console.error('[BitlyClient] Error in createCustomBitlink:', error.message);
      return longUrl;
    }
  }
}
