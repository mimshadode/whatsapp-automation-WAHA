# Panduan Hosting Docker di Railway.app

Panduan ini akan membantu Anda meng-online-kan bot WhatsApp & Google Form ini menggunakan layanan Railway.

## Prasyarat

1.  Akun GitHub (untuk menyimpan kode).
2.  Akun Railway (login menggunakan GitHub).
3.  Kode proyek ini sudah di-push ke repository GitHub.

---

## Langkah 1: Persiapan Repository

Pastikan file `Dockerfile` sudah ada di root folder proyek Anda (sudah saya buatkan). Push kode terbaru ke GitHub:

```bash
git add .
git commit -m "Siap deploy ke Railway"
git push origin main
```

---

## Langkah 2: Membuat Project Baru di Railway

1.  Buka [Railway Dashboard](https://railway.app/dashboard).
2.  Klik **+ New Project**.
3.  Pilih **Deploy from GitHub repo**.
4.  Pilih repository `whatsapp_automation_next` Anda.
5.  Klik **Deploy Now**.
    - _Note: Deployment pertama mungkin gagal karena belum ada database/env vars, tidak apa-apa._

---

## Langkah 3: Menambahkan Database (Postgres & Redis)

Di tampilan project canvas Railway:

1.  Klik kanan di area kosong -> **Database** -> **Add PostgreSQL**.
2.  Klik kanan lagi -> **Database** -> **Add Redis**.

Tunggu beberapa saat hingga kedua database selesai dibuat.

---

## Langkah 4: Menambahkan WAHA (WhatsApp API)

Karena WAHA running dari Docker Image, kita perlu menambahkannya sebagai service terpisah:

1.  Klik **+ New** -> **Docker Image**.
2.  Masukkan Image Name: `devlikeapro/waha:Plus` (atau `devlikeapro/waha:latest` jika versi Plus berbayar).
    - _Rekomendasi:_ Gunakan tag yang stabil.
3.  Setelah service WAHA muncul, klik service tersebut -> **Settings**.
4.  Scroll ke **Environment Variables**, tambahkan:
    - `WHATSAPP_DEFAULT_ENGINE`: `NOWEB`
    - `WAHA_DASHBOARD_USERNAME`: `admin`
    - `WAHA_DASHBOARD_PASSWORD`: `admin123` (ganti sesuai keinginan)
    - `WAHA_API_KEY`: `75b08331d7774ee5850f711f9b2c7206` (atau generate baru)
    - `WHATSAPP_HOOK_URL`: Nanti diisi setelah App Next.js punya URL publik (misal: `https://my-app.up.railway.app/api/webhook`).
5.  Klik **Generale** -> **Public Domain** -> Generate Domain. (Contoh: `waha-production.up.railway.app`).
    - Simpan URL ini untuk nanti.

---

## Langkah 5: Konfigurasi Environment Variables (Next.js App)

Klik service repository GitHub Anda (aplikasi Next.js), lalu masuk ke tab **Variables**. Masukkan data berikut:

### Database & Cache (Otomatis/Manual)

Railway biasanya otomatis menyediakan `DATABASE_URL` dan `REDIS_URL` jika dalam satu project. Cek tab variables, jika belum ada, copy dari service Postgres/Redis:

- `DATABASE_URL`: `postgresql://...` (Ambil dari tab Connect service Postgres)
- `REDIS_URL`: `redis://...` (Ambil dari tab Connect service Redis)

### Konfigurasi App

Salin semua value dari file `.env.local` di komputer Anda, **KECUALI** `DATABASE_URL` dan `REDIS_URL` yang sudah diisi di atas.

Kunci penting yang harus disesuaikan:

- `WAHA_API_URL`: Isi dengan **Public Domain** WAHA dari Langkah 4 (contoh: `https://waha-production.up.railway.app`). _Jangan pakai localhost_.
- `WAHA_API_KEY`: Samakan dengan yang di Langkah 4.
- `GOOGLE_REDIRECT_URI`: Ganti domain `http://localhost:3001` menjadi domain publik App Next.js Anda (lihat Langkah 6).
  - Contoh: `https://my-nextjs-app.up.railway.app/api/auth/google/callback`
  - **PENTING:** Jangan lupa tambahkan URL baru ini di **Google Cloud Console** -> **Credentials** -> **Authorized redirect URIs**.

---

## Langkah 6: Public Domain & Redeploy

1.  Di service Next.js App, ke tab **Settings** -> **Public Networking** -> **Generate Domain**.
2.  Copy domain tersebut (misal: `my-nextjs-app.up.railway.app`).
3.  Update variable `WHATSAPP_HOOK_URL` di service **WAHA**:
    - Value: `https://my-nextjs-app.up.railway.app/api/webhook`
4.  Update variable `GOOGLE_REDIRECT_URI` di service **Next.js App**:
    - Value: `https://my-nextjs-app.up.railway.app/api/auth/google/callback`
5.  Redeploy kedua service (biasanya otomatis restart saat ganti variable).

---

## Langkah 7: Scan QR Code

1.  Buka Dashboard WAHA di browser: `https://waha-production.up.railway.app/dashboard`.
2.  Login dengan username/password yang di-set di Langkah 4.
3.  Scan QR Code untuk menghubungkan WhatsApp.
4.  Selesai! Bot Anda sekarang online 24/7 di cloud.
