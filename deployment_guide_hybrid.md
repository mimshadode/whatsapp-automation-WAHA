# Panduan Deployment Hybrid (Vercel + Supabase + Railway)

Panduan ini disesuaikan dengan request Anda:

1.  **Next.js App**: Di-hosting di **Vercel**.
2.  **Database**: Di-hosting di **Supabase** (Gratis).
3.  **Redis & WAHA**: Di-hosting di **Railway**.

---

## Bagian 1: Setup Database (Supabase)

1.  Buka [Supabase](https://supabase.com) dan login.
2.  Klik **New Project**.
3.  Isi nama project dan database password (simpan password ini!).
4.  Pilih region terdekat (misal: Singapore).
5.  Setelah project selesai dibuat, ke menu **Project Settings** (icon gear) -> **Database**.
6.  Scroll ke bagian **Connection String** -> pilih tab **URI**.
7.  Copy connection string tersebut.
    - _Note:_ Ganti `[YOUR-PASSWORD]` dengan password yang Anda buat tadi.
    - Simpan URL ini sebagai `DATABASE_URL` untuk nanti.

---

## Bagian 2: Setup Redis & WAHA (Railway)

Karena WAHA butuh Docker dan kita butuh Redis, kita pakai Railway untuk ini.

1.  Buka [Railway](https://railway.app) -> **New Project** -> **Empty Project**.
2.  **Tambahkan Redis**:
    - **Postgres**: Klik service Postgres -> **Connect** -> Copy **Postgres Connection URL**.
    - **Redis**: Klik service Redis -> **Connect** -> **Public Networking** (Pastikan sudah di-generate domainnya).
      - **PENTING:** Gunakan **Public Connection URL** (biasanya diawali `redis://...maglev.proxy.rlwy.net...`), JANGAN pakai yang `.railway.internal`.
    - **WAHA**: Copy domain publik WAHA (misal `https://waha-app.up.railway.app`).
3.  **Tambahkan WAHA**:
    - Klik **+ New** -> **Docker Image**.
    - Image Name: `devlikeapro/waha:Plus`.
    - Klik service WAHA -> **Settings** -> **Variables**, isi:
      - `WHATSAPP_DEFAULT_ENGINE`: `NOWEB`
      - `WAHA_DASHBOARD_USERNAME`: `admin`
      - `WAHA_DASHBOARD_PASSWORD`: `admin123`
      - `WAHA_API_KEY`: `75b08331d7774ee5850f711f9b2c7206`
    - Klik **Generale** -> **Public Domain** -> Generate Domain.
    - Simpan domain publik ini (misal `https://waha-app.up.railway.app`) sebagai `WAHA_API_URL`.

---

## Bagian 3: Setup Frontend (Vercel)

1.  Push kode ke **GitHub**.
2.  Di [Vercel](https://vercel.com), buat **New Project** dari repo tersebut.
3.  Di **Environment Variables**, masukkan:

    | Variable               | Value                                                         |
    | :--------------------- | :------------------------------------------------------------ |
    | `DATABASE_URL`         | URL dari **Supabase** (Bagian 1).                             |
    | `REDIS_URL`            | URL dari **Railway** (Bagian 2).                              |
    | `WAHA_API_URL`         | URL WAHA dari Railway (`https://waha-app.up.railway.app`).    |
    | `WAHA_API_KEY`         | `75b08331d7774ee5850f711f9b2c7206`                            |
    | `BIZNET_API_KEY`       | (Copy dari .env.local)                                        |
    | `GOOGLE_CLIENT_ID`     | (Copy dari .env.local)                                        |
    | `GOOGLE_CLIENT_SECRET` | (Copy dari .env.local)                                        |
    | `GOOGLE_REDIRECT_URI`  | `https://[NAMA-APP-ANDA].vercel.app/api/auth/google/callback` |
    | `ALLOWED_USERS`        | (Copy dari .env.local)                                        |

4.  **Deploy Project**.

---

## Bagian 4: Menghubungkan (Wiring)

1.  **Migrasi Database (PENTING)**:
    - Vercel biasanya tidak otomatis menjalankan `prisma migrate`. Anda perlu menjalankannya dari laptop Anda untuk membuat tabel di Supabase.
    - Di file `.env.local` di laptop Anda, ubah sementara `DATABASE_URL` menjadi URL Supabase Anda.
    - Jalankan: `npx prisma db push`
    - (Kembalikan `.env.local` ke localhost jika ingin dev lokal lagi).

2.  **Update Webhook WAHA**:
    - Di Railway, buka service **WAHA** -> **Variables**.
    - Isi `WHATSAPP_HOOK_URL`: `https://[DOMAIN-VERCEL-ANDA]/api/webhook`.
    - Railway akan restart WAHA.

3.  **Update Google Console**:
    - Tambahkan `https://[DOMAIN-VERCEL-ANDA]/api/auth/google/callback` ke **Authorized redirect URIs**.

4.  **Selesai**: Scan QR code di Dashboard WAHA Railway, dan bot siap digunakan!
