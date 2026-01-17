# ⚠️ OAuth Setup - Action Required

## Error yang Terjadi

Anda mendapat error: **"Missing required parameter: redirect_uri"**

Ini terjadi karena **OAuth credentials belum dikonfigurasi** di file `.env`.

---

## ✅ Solusi: Ikuti Langkah Berikut

### Step 1: Buat OAuth Client di Google Cloud Console

1. **Buka Google Cloud Console:**
   - URL: https://console.cloud.google.com/
   - Pilih project: `project-1-484518`

2. **Buka Credentials:**
   - Menu: **APIs & Services** → **Credentials**

3. **Create OAuth Client ID:**
   - Klik **+ CREATE CREDENTIALS**
   - Pilih **OAuth client ID**
4. **Configure OAuth Consent Screen** (jika belum):
   - Klik **CONFIGURE CONSENT SCREEN**
   - User Type: **External** (atau Internal jika workspace)
   - Klik **CREATE**
   - App name: `WhatsApp Form Automation`
   - User support email: pilih email Anda
   - Developer contact: isi email Anda
   - Klik **SAVE AND CONTINUE**
   - Scopes: klik **SAVE AND CONTINUE** (skip)
   - Test users: tambahkan email Anda
   - Klik **SAVE AND CONTINUE**

5. **Kembali ke Create OAuth Client ID:**
   - Application type: **Web application**
   - Name: `WhatsApp Form Bot`
   - **Authorized redirect URIs**, klik **+ ADD URI**:
     ```
     http://localhost:3001/api/auth/google/callback
     ```
   - Klik **CREATE**

6. **Copy Credentials:**
   - Akan muncul popup dengan **Client ID** dan **Client Secret**
   - **COPY KEDUANYA!**

---

### Step 2: Update File .env dan .env.local

Buka file `.env` dan `.env.local`, lalu **ganti** baris berikut:

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

**Dengan credentials yang Anda copy dari Google Cloud Console:**

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234efgh5678
```

> ⚠️ **Penting:** Ganti `YOUR_CLIENT_ID_HERE` dan `YOUR_CLIENT_SECRET_HERE` dengan nilai yang sebenarnya!

---

### Step 3: Restart Next.js Server

Jika server sedang running, restart:

```bash
# Tekan Ctrl+C untuk stop
# Lalu jalankan lagi:
npm run dev
```

---

### Step 4: Authorize OAuth

1. **Buka browser:**

   ```
   http://localhost:3001/api/auth/google
   ```

2. **Login dengan Google account Anda**

3. **Allow permissions** yang diminta

4. **Copy GOOGLE_REFRESH_TOKEN** dari halaman callback

5. **Tambahkan ke .env dan .env.local:**

   ```env
   GOOGLE_REFRESH_TOKEN=1//0abcdef...
   ```

6. **Restart server lagi**

---

### Step 5: Test OAuth Client

```bash
npx tsx test-google-forms-oauth.ts
```

**Expected output:**

```
✅ SUCCESS! Form created:
Form ID: abc123
URL: https://docs.google.com/forms/d/e/abc123/viewform
```

---

## 📸 Screenshot Error Anda

![OAuth Error](file:///C:/Users/CWNTONG/.gemini/antigravity/brain/2db03f78-7f95-4da5-b213-f57466891be3/uploaded_image_1768644080647.png)

Error ini normal karena OAuth credentials belum di-set. Setelah mengikuti langkah di atas, error akan hilang.

---

## 🆘 Troubleshooting

### "redirect_uri_mismatch"

- Pastikan redirect URI di Google Cloud Console **PERSIS** sama dengan:
  ```
  http://localhost:3001/api/auth/google/callback
  ```
- Tidak boleh ada trailing slash `/`
- Harus `http://` bukan `https://` untuk localhost

### "Access blocked: This app's request is invalid"

- Pastikan OAuth consent screen sudah dikonfigurasi
- Tambahkan email Anda sebagai test user

### "invalid_client"

- Client ID atau Client Secret salah
- Copy ulang dari Google Cloud Console

---

## 📋 Checklist

- [ ] OAuth Client sudah dibuat di Google Cloud Console
- [ ] Client ID dan Client Secret sudah di-copy
- [ ] File `.env` dan `.env.local` sudah diupdate
- [ ] Server sudah di-restart
- [ ] Berhasil authorize di http://localhost:3001/api/auth/google
- [ ] Refresh token sudah ditambahkan ke `.env`
- [ ] Test script berhasil membuat form

---

## 💡 Tips

Jika masih bingung, screenshot setiap step dan share ke saya untuk bantuan lebih lanjut!
