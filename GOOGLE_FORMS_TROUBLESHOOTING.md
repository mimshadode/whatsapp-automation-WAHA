# Google Forms API - Troubleshooting Guide

## ❌ Current Issue: HTTP 500 Internal Error

Saat ini mendapatkan error `500 Internal error` dari Google Forms API. Ini menandakan ada masalah dengan konfigurasi Google Cloud Project.

## ✅ Solusi: Langkah-langkah Perbaikan

### 1. Aktifkan Google Forms API

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project: **project-1-484518**
3. Pergi ke **APIs & Services** > **Library**
4. Cari **"Google Forms API"**
5. Klik **ENABLE**

### 2. Aktifkan Google Drive API (Juga Diperlukan)

1. Masih di **APIs & Services** > **Library**
2. Cari **"Google Drive API"**
3. Klik **ENABLE**

### 3. Verifikasi Service Account Permissions

Service Account yang digunakan:

```
form-bot@project-1-484518.iam.gserviceaccount.com
```

**Permissions yang diperlukan:**

- `https://www.googleapis.com/auth/forms.body` - Untuk create/edit forms
- `https://www.googleapis.com/auth/forms.responses.readonly` - Untuk read responses
- `https://www.googleapis.com/auth/drive` - Untuk manage file permissions

### 4. Cara Mengecek API yang Sudah Diaktifkan

Jalankan command ini untuk mengecek:

```bash
# Test dengan curl
curl "https://forms.googleapis.com/v1/forms" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"info":{"title":"Test Form"}}'
```

Atau gunakan Google Cloud Console:

1. Buka **APIs & Services** > **Dashboard**
2. Lihat list API yang sudah enabled
3. Pastikan **Google Forms API** dan **Google Drive API** ada di list

### 5. Alternative: Test dengan Google Cloud Console

Jika masih error, coba test langsung di Google Cloud Console:

1. Buka [API Explorer - Forms API](https://developers.google.com/forms/api/reference/rest/v1/forms/create)
2. Klik **Try this API**
3. Isi request body:
   ```json
   {
     "info": {
       "title": "Test Form"
     }
   }
   ```
4. Klik **Execute**

Jika berhasil di API Explorer tapi gagal di aplikasi, berarti ada masalah dengan Service Account credentials.

### 6. Regenerate Service Account Key (Jika Perlu)

Jika langkah di atas tidak berhasil:

1. Buka [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Pilih project **project-1-484518**
3. Cari service account: `form-bot@project-1-484518.iam.gserviceaccount.com`
4. Klik **Actions** > **Manage Keys**
5. Klik **Add Key** > **Create new key**
6. Pilih **JSON**
7. Download file JSON
8. Copy isi file ke `.env.local`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=form-bot@project-1-484518.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

## 🔍 Cara Verifikasi Setelah Perbaikan

Setelah mengaktifkan API, jalankan test script:

```bash
npx tsx test-google-forms.ts
```

**Expected output jika berhasil:**

```
=== Testing Google Forms Creation ===

Environment Check:
GOOGLE_SERVICE_ACCOUNT_EMAIL: ✓ SET
GOOGLE_PRIVATE_KEY: ✓ SET (1234 chars)

✓ GoogleFormsClient initialized

Creating form with questions: [...]

✅ SUCCESS! Form created:
Form ID: abc123xyz
Title: Test Form - 2026-01-17T...
URL: https://docs.google.com/forms/d/e/abc123xyz/viewform
Edit URL: https://docs.google.com/forms/d/abc123xyz/edit
```

## 📝 Checklist

- [ ] Google Forms API sudah di-enable
- [ ] Google Drive API sudah di-enable
- [ ] Service Account memiliki permissions yang benar
- [ ] Test script berhasil membuat form
- [ ] Bisa akses form URL yang di-generate

## 🆘 Jika Masih Error

Jika setelah semua langkah di atas masih error, kemungkinan:

1. **Quota exceeded** - Check quota di Google Cloud Console
2. **Billing not enabled** - Pastikan billing sudah aktif untuk project
3. **API restrictions** - Check apakah ada API key restrictions
4. **Regional restrictions** - Beberapa API mungkin tidak tersedia di region tertentu

Silakan share error message yang muncul untuk troubleshooting lebih lanjut.
