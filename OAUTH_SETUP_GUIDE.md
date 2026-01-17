# Google Forms OAuth Setup Guide

## 📋 Langkah-langkah Setup OAuth Client

### Step 1️⃣: Buat OAuth Client di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project: **project-1-484518**
3. Menu: **APIs & Services** → **Credentials**
4. Klik **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `WhatsApp Form Automation`
7. **Authorized redirect URIs**, tambahkan:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
   (Jika deploy ke production, tambahkan juga production URL)
8. Klik **CREATE**
9. Copy **Client ID** dan **Client Secret**

### Step 2️⃣: Tambahkan Credentials ke .env.local

Buka file `.env.local` dan tambahkan:

```env
# Google OAuth Client
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

### Step 3️⃣: Dapatkan Refresh Token

1. **Start Next.js server:**

   ```bash
   npm run dev
   ```

2. **Buka browser dan kunjungi:**

   ```
   http://localhost:3001/api/auth/google
   ```

3. **Authorize dengan Google account Anda:**
   - Pilih akun Google
   - Klik "Allow" untuk memberikan permissions
   - Anda akan di-redirect ke callback page

4. **Copy GOOGLE_REFRESH_TOKEN** dari halaman callback

5. **Tambahkan ke .env.local:**

   ```env
   GOOGLE_REFRESH_TOKEN=your_refresh_token_here
   ```

6. **Restart Next.js server** (Ctrl+C, lalu `npm run dev` lagi)

### Step 4️⃣: Test OAuth Client

Jalankan test script:

```bash
npx tsx test-google-forms-oauth.ts
```

**Expected output:**

```
=== Testing Google Forms OAuth Client ===

Environment Check:
GOOGLE_CLIENT_ID: ✓ SET
GOOGLE_CLIENT_SECRET: ✓ SET
GOOGLE_REFRESH_TOKEN: ✓ SET

✓ GoogleFormsOAuthClient initialized

Creating form with 8 questions...

✅ SUCCESS! Form created:
Form ID: abc123xyz
Title: Form Pendaftaran Event - 2026-01-17T...
Responder URL: https://docs.google.com/forms/d/e/abc123xyz/viewform
Edit URL: https://docs.google.com/forms/d/abc123xyz/edit
```

### Step 5️⃣: Update AI Tools (Optional)

Jika ingin menggunakan OAuth client di AI tools, update file:

**`lib/ai/tools/google-form-creator.ts`:**

```typescript
import { GoogleFormsOAuthClient } from "@/lib/google-forms-oauth-client";

// Ganti GoogleFormsClient dengan GoogleFormsOAuthClient
this.forms = new GoogleFormsOAuthClient();
```

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"

**Solusi:** Pastikan redirect URI di Google Cloud Console sama persis dengan yang di `.env.local`

### Error: "invalid_grant"

**Solusi:** Refresh token expired. Ulangi Step 3 untuk mendapatkan refresh token baru.

### Error: "Access blocked: This app's request is invalid"

**Solusi:**

1. Pastikan OAuth consent screen sudah dikonfigurasi
2. Tambahkan email Anda sebagai test user jika app masih dalam testing mode

---

## 📊 Perbandingan: OAuth vs Service Account

| Feature            | OAuth Client             | Service Account             |
| ------------------ | ------------------------ | --------------------------- |
| **Setup**          | Perlu user authorization | Hanya perlu JSON key        |
| **Permissions**    | User's permissions       | Service account permissions |
| **Form ownership** | Owned by user            | Owned by service account    |
| **Best for**       | User-facing apps         | Server-to-server            |
| **Token refresh**  | Auto via refresh token   | Auto via JWT                |

**Rekomendasi:**

- Gunakan **OAuth** jika ingin form dimiliki oleh user yang login
- Gunakan **Service Account** jika ingin form dimiliki oleh bot/system

---

## 🎯 Next Steps

Setelah OAuth setup berhasil:

1. ✅ Test form creation via test script
2. ✅ Verify form bisa diakses di Google Forms
3. ✅ Test semua tipe pertanyaan (text, radio, checkbox, dll)
4. ✅ Integrate dengan WhatsApp bot
5. ✅ Test end-to-end flow

---

## 📝 Files Created

- [`lib/google-forms-oauth-client.ts`](file:///c:/Users/CWNTONG/Documents/Whatsapp%20Google%20Form%20Automation/whatsapp_automation_next/lib/google-forms-oauth-client.ts) - OAuth client implementation
- [`app/api/auth/google/route.ts`](file:///c:/Users/CWNTONG/Documents/Whatsapp%20Google%20Form%20Automation/whatsapp_automation_next/app/api/auth/google/route.ts) - OAuth initiation endpoint
- [`app/api/auth/google/callback/route.ts`](file:///c:/Users/CWNTONG/Documents/Whatsapp%20Google%20Form%20Automation/whatsapp_automation_next/app/api/auth/google/callback/route.ts) - OAuth callback handler
- [`test-google-forms-oauth.ts`](file:///c:/Users/CWNTONG/Documents/Whatsapp%20Google%20Form%20Automation/whatsapp_automation_next/test-google-forms-oauth.ts) - Test script

---

## 🆘 Need Help?

Jika ada error atau pertanyaan, silakan share:

1. Error message lengkap
2. Step yang sedang dilakukan
3. Screenshot jika perlu
