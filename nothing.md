# Audit UX Sistem Admin — LKP Anna Wakatobi

**Tanggal audit:** 20 Agustus 2026  
**Ruang lingkup:** seluruh halaman admin, layout bersama, komponen Blade, route admin, CSS admin, dan kontrak/test UI yang tersedia.  
**Tujuan pengguna:** admin/staff operasional non-teknis.

## Metode dan batasan

Audit dilakukan read-only berdasarkan source code yang tersedia. Saya memeriksa 20 modul halaman admin, 59 file Blade di bawah `resources/views/admin`, layout `resources/views/layouts/admin.blade.php`, 13 komponen bersama, route admin, serta `public/css/admin-redesigned.css` dan stylesheet terkait.

- **Code-confirmed:** masalah terlihat langsung dari markup, label, atau perilaku JavaScript.
- **Inferred:** risiko kuat berdasarkan struktur CSS/markup, tetapi perlu konfirmasi browser.
- **Runtime verification:** belum dilakukan karena koneksi Chrome DevTools tidak tersedia pada sesi ini. Responsivitas dan overflow perlu smoke test browser pada desktop dan lebar 375px sebelum implementasi.

## 1. Ringkasan eksekutif

Secara umum, panel sudah memiliki fondasi visual yang cukup baik: judul halaman, sidebar aktif, status berwarna, ikon pada banyak aksi, modal untuk input, dan beberapa empty state yang memberi langkah berikutnya. Namun, pengalaman belum konsisten untuk petugas non-teknis karena ada dua sistem UI yang berjalan bersamaan, istilah internal masih muncul di layar, dan aksi berisiko tinggi belum memakai pola konfirmasi/feedback yang seragam.

**Jumlah halaman/modul yang diaudit:** 20 modul utama, mencakup seluruh route admin yang tampil ke operator.  
**Jumlah temuan:** 25 temuan terpisah; temuan systemic tidak diduplikasi di setiap halaman.

| Severity | Jumlah | Makna praktis |
|---|---:|---|
| High | 7 | Berpotensi menyebabkan perubahan data yang salah, tindakan sulit dipulihkan, atau membuat petugas tidak tahu hasil proses penting. |
| Medium | 14 | Menimbulkan ambiguitas, memperlambat kerja, atau meningkatkan peluang salah klik. |
| Low | 4 | Ketidakkonsistenan/polish yang mengurangi kejelasan tetapi biasanya tidak menghentikan tugas. |

**Prioritas utama:** satukan komponen/status/feedback, amankan aksi finansial dan maintenance, hilangkan istilah teknis dari layar kerja, lalu lakukan verifikasi mobile pada tabel dan modal.

## 2. Masalah systemic

Temuan di bawah ini dicatat satu kali karena memengaruhi banyak halaman atau berasal dari pola bersama.

### S1 — Dua sistem UI dan dua sumber token berjalan bersamaan

- **Lokasi:** `resources/views/layouts/admin.blade.php`, `resources/views/components/*.blade.php`, banyak view admin, `public/css/admin-redesigned.css`, `resources/css/hope-ui.css`, `resources/css/app.css`.
- **Masalah:** sebagian halaman memakai `.btn`, `.filter-bar`, `.panel`, `.table-card`, dan `var(--accent)`, sementara halaman lain memakai utility Tailwind/Hope UI seperti `hope-*`, `bg-slate-*`, `rounded-2xl`, dan warna hardcoded. Komponen `empty-state` memakai `hope-button`, sedangkan tombol umum memakai `.btn`; `badge` juga mencampur class CSS dengan utility Tailwind dan masih mengembalikan label Inggris seperti `Unpaid`, `Paid`, `Partial`.
- **Severity:** Medium.
- **Rekomendasi:** tetapkan satu kontrak UI admin untuk tombol, status, panel, tabel, field, empty state, dan focus state. Migrasikan halaman bertahap dari komponen bersama terlebih dahulu, lalu halaman per modul.

### S2 — Button hierarchy belum seragam di seluruh panel

- **Lokasi:** pola berulang di `students/index.blade.php`, `classes/index.blade.php`, `activity-log/index.blade.php`, `reports/index.blade.php`, `invoices/index.blade.php`, `registrations/show.blade.php`, dan halaman operasional lain.
- **Masalah:** tombol solid/primary dipakai untuk create, cari/terapkan filter, sinkronisasi, kirim, dan keputusan approve/reject. Dalam satu layar, beberapa tindakan sama-sama tampil dominan; pada beberapa aksi approve/reject warna hanya diubah melalui inline style pada `variant="primary"`.
- **Severity:** Medium.
- **Rekomendasi:** definisikan hierarki tetap: satu primary untuk tujuan utama, outline untuk filter/export/navigasi, success untuk menyetujui/menerima, danger untuk menolak/membatalkan/menghapus, dan secondary untuk aksi pendukung.

### S3 — Feedback sukses/error tidak mempunyai satu pola yang dapat diandalkan

- **Lokasi:** `resources/views/layouts/admin.blade.php`, `resources/views/components/toast.blade.php`, form admin, `resources/views/admin/registrations/index.blade.php`.
- **Masalah:** layout hanya menampilkan `$errors->first()` dalam alert umum; toast bergantung pada session key yang tidak seragam (`toast`, `success`, `error`). Beberapa aksi AJAX sinkronisasi menampilkan hasil sendiri, sedangkan aksi submit biasa tidak selalu memiliki indikator sukses yang terlihat. Pesan error bisa berasal langsung dari validasi/backend tanpa jaminan bahasa operasional.
- **Severity:** High.
- **Rekomendasi:** gunakan satu komponen feedback global dengan status sukses/gagal, pesan yang menyebut tindakan dan langkah berikutnya, `role="status"`/`aria-live`, serta preservasi input ketika validasi gagal.

### S4 — Loading dan pencegahan double-submit hanya diterapkan sebagian

- **Lokasi:** `components/toast.blade.php`, layout admin, class `.btn-loading`, `registrations/index.blade.php`, beberapa export/generate form.
- **Masalah:** hanya tombol dengan `.btn-loading` atau sinkronisasi khusus yang dinonaktifkan saat proses. Submit form create/edit, pembayaran, approve, payroll, attendance, dan maintenance umumnya tidak diberi loading/disabled state. Handler global mengembalikan tombol setelah empat detik meskipun request belum tentu selesai.
- **Severity:** High untuk pembayaran, payroll, approval, dan migrasi; Medium untuk form biasa.
- **Rekomendasi:** pasang state in-flight pada semua form yang mengubah data: disable tombol submit, ubah label menjadi tindakan yang sedang berjalan, cegah submit kedua, dan pulihkan state berdasarkan respons selesai/gagal.

### S5 — Konfirmasi tindakan berisiko memakai `confirm()` generik dan tidak seragam

- **Lokasi:** `students/index.blade.php`, `classes/index.blade.php`, `branches/index.blade.php`, `users/index.blade.php`, `roles/index.blade.php`, `enrollments/index.blade.php`, `invoices/show.blade.php`, `payrolls/show.blade.php`, `maintenance/index.blade.php`.
- **Masalah:** banyak dialog hanya berbunyi `Hapus ...?`, `Batalkan pembayaran ini?`, atau `Tutup`, tanpa menjelaskan akibat, objek lengkap, atau apakah tindakan dapat dipulihkan. Sebaliknya, hapus permanen pendaftaran sudah memakai penjelasan konsekuensi dan kode konfirmasi, tetapi pola ini tidak dipakai di modul lain.
- **Severity:** High untuk hapus, void pembayaran, tutup sesi, bayar payroll, dan migrasi; Medium untuk aksi lainnya.
- **Rekomendasi:** buat tingkat konfirmasi berdasarkan risiko. Jelaskan data yang berubah, konsekuensi, dan apakah dapat dibatalkan; gunakan input konfirmasi/kata kunci untuk penghapusan permanen atau migrasi.

### S6 — Istilah teknis/internal bocor ke UI dan dokumentasi

- **Lokasi:** `components/badge.blade.php`, `students/show.blade.php`, `classes/show.blade.php`, `invoices/show.blade.php`, `roles/index.blade.php`, `maintenance/index.blade.php`, `documentation/index.blade.php`, `documentation/sop.blade.php`.
- **Masalah:** contoh yang terlihat adalah `active`, `partial`, `overdue`, `pending`, `monthly_rate`, `manage_students`, `Class is Full`, `php artisan migrate --force`, `Void Payment`, `Payroll Pro-Rata`, dan nama permission mentah. Sebagian istilah sudah diterjemahkan di daftar, tetapi tidak di detail/empty/error yang lain.
- **Severity:** Medium.
- **Rekomendasi:** buat kamus label UI terpusat untuk status, jenis tagihan, tipe transaksi, permission, dan error operasional. Istilah teknis boleh ada di dokumentasi admin utama, tetapi jangan menjadi label kerja default staff.

### S7 — Pola tabel responsif mengandalkan overflow horizontal dan aksi rapat

- **Lokasi:** `public/css/admin-redesigned.css` (`.table-card`, `table min-width:700px`, `white-space:nowrap`), seluruh index/table view admin, layout mobile.
- **Masalah:** tabel sengaja memiliki `min-width:700px` dan banyak cell `white-space:nowrap`; pada layar kecil pengguna harus menggeser horizontal untuk menemukan status/aksi. Aksi per baris dapat berisi beberapa chip sekaligus. Ini berisiko membuat tombol penting tidak terlihat pada viewport 375px.
- **Severity:** Medium, menjadi High bila aksi utama atau status berada di luar area yang terlihat.
- **Rekomendasi:** lakukan audit browser di 375px. Untuk tabel padat, prioritaskan kolom utama, izinkan wrapping terkontrol, pindahkan aksi ke menu/stack vertikal, dan pastikan status serta primary action tetap mudah ditemukan.

### S8 — Komponen field belum menjamin label dan aksesibilitas secara default

- **Lokasi:** `components/input.blade.php`, `select.blade.php`, `textarea.blade.php`, view yang menulis input manual.
- **Masalah:** label hanya dirender jika prop `label` dikirim; komponen dapat menghasilkan input tanpa label yang terlihat. Banyak input filter hanya mengandalkan placeholder. Beberapa label manual tidak memiliki `for`, beberapa tombol/icon-only tidak memiliki `aria-label`, dan accordions SOP memakai `div` clickable alih-alih button.
- **Severity:** Medium.
- **Rekomendasi:** jadikan label eksplisit sebagai default untuk field kerja, pastikan `for`/`id` cocok, beri accessible name pada tombol icon-only, dan gunakan elemen button untuk accordion/dropdown interaktif.

### S9 — Istilah navigasi tidak selalu sama dengan judul halaman

- **Lokasi:** `layouts/admin.blade.php`, `admin/enrollments/index.blade.php`, `admin/tutor-contracts/index.blade.php`, `admin/roles/index.blade.php`, classes/schedule packages.
- **Masalah:** sidebar menampilkan `Anggota Kelas`, halaman menampilkan `Penempatan Kelas`; sidebar `Kontrak Tutor`, halaman `Kontrak & Gaji Tutor`; sidebar `Pengguna & Peran`, halaman `Role & Permission`. Pada halaman detail kelas, tab dan judul juga dapat berganti lewat JavaScript tanpa memperbarui semua orientasi halaman secara konsisten.
- **Severity:** Medium.
- **Rekomendasi:** pilih satu istilah staff-facing per modul dan gunakan persis pada sidebar, judul, breadcrumb, tombol, SOP, dan empty state.

### S10 — Ikon cukup konsisten untuk pola umum, tetapi makna aksi berisiko belum konsisten

- **Lokasi:** `components/sidebar-link.blade.php`, `components/chip.blade.php`, view action buttons.
- **Masalah:** eye/edit/trash sudah berulang, tetapi approve, reject, void, close session, stop camera, dan migrate memakai variasi ikon/label tanpa kontrak bersama. Ikon `layers` untuk Anggota Kelas dan `book-open` untuk Kelas & Jadwal tidak menjelaskan perbedaan bagi staff baru.
- **Severity:** Low–Medium.
- **Rekomendasi:** buat daftar pasangan ikon-label resmi untuk lihat, ubah, tambah, setujui, tolak, batalkan, tutup sesi, unduh, dan hapus. Jangan mengandalkan warna/ikon tanpa label teks.

## 3. Temuan per halaman/file

Temuan di bawah berfokus pada masalah yang spesifik terhadap halaman. Isu systemic di atas tidak diulang kecuali dampaknya khas pada halaman tersebut.

### Dashboard

**File:** `resources/views/admin/dashboard.blade.php`, `resources/views/admin/dashboard-hope.blade.php`

- **D1 — Dua implementasi dashboard dengan bahasa dan komponen berbeda.** Kedua view memiliki isi serupa tetapi markup, status, empty state, dan komponen berbeda. Ini meningkatkan risiko staff melihat perilaku/label yang tidak sama tergantung route/controller. **Severity: Medium.** Satukan satu dashboard kanonik dan satu sumber komponen/label.
- **D2 — Empty state aktivitas tidak memberi tindakan berikutnya.** `Belum ada aktivitas terbaru` hanya informatif, sementara dashboard memiliki konteks operasional yang memungkinkan link ke modul terkait. **Severity: Low.** Tambahkan arahan singkat atau link ke Pendaftaran, Siswa, atau Tagihan bila memang relevan.
- **D3 — Grafik kelas berpotensi padat pada banyak kelas.** SVG memberi label setiap kelas pada satu sumbu dan tidak menunjukkan strategi wrapping/truncation. **Severity: Medium, inferred.** Uji dengan banyak kelas pada desktop/mobile; gunakan tooltip/list ringkas atau label yang dapat dibaca.

### Data Siswa

**Files:** `students/index.blade.php`, `students/create.blade.php`, `students/edit.blade.php`, `students/show.blade.php`, serta ID card views/partials.

- **ST1 — Hapus siswa memakai konfirmasi generik.** `confirm('Hapus siswa ini?')` tidak menjelaskan dampak terhadap kelas, absensi, tagihan, atau riwayat. **Severity: High.** Tampilkan nama siswa dan konsekuensi; bila tindakan sebenarnya menonaktifkan, gunakan label nonaktifkan, bukan hapus.
- **ST2 — Detail siswa menampilkan status mentah.** `students/show.blade.php` menampilkan `active`, status enrollment mentah, serta `paid`, `partial`, `overdue`, atau status invoice fallback mentah. **Severity: Medium.** Gunakan label Indonesia yang sama dengan daftar siswa/tagihan.
- **ST3 — Form create/edit terlalu bergantung pada accordion tertutup.** Semua bagian create tertutup default dan satu klik di luar form menutup bagian yang sedang dibuka. Ini dapat membuat staff kehilangan konteks atau mengira field belum tersedia. **Severity: Medium.** Buka bagian pertama secara jelas, pertahankan bagian saat fokus/validasi, dan jangan menutup otomatis ketika klik area lain yang tidak berbahaya.
- **ST4 — Form memiliki banyak field opsional tanpa penanda prioritas.** Label ada, tetapi staff harus membuka lima bagian untuk memahami mana yang wajib; beberapa field penting seperti status/jenjang tidak berada di awal. **Severity: Medium.** Tandai wajib/opsional secara konsisten dan kelompokkan data yang diperlukan untuk menyimpan siswa pada langkah pertama.
- **ST5 — Aksi cetak massal bergantung pada alert browser.** Jika tidak ada siswa dipilih, pesan muncul sebagai `alert()` dan tidak berada dekat checkbox/action. **Severity: Low.** Tampilkan inline message atau dialog yang menjelaskan cara memilih siswa.

### Pendaftaran Baru

**Files:** `registrations/index.blade.php`, `registrations/show.blade.php`, registration sync scripts/components.

- **R1 — Alur sinkronisasi sudah punya loading, tetapi hasilnya terlalu teknis/berbasis angka.** Pesan `Selesai: created..., updated..., unchanged..., skipped..., failed...` memakai istilah Inggris dan angka tanpa menjelaskan tindakan lanjutan untuk item gagal. **Severity: Medium.** Terjemahkan hasil dan tambahkan instruksi untuk memeriksa ulang item gagal.
- **R2 — Pendaftaran menerima/menolak adalah keputusan besar tanpa konfirmasi tahap akhir.** Form langsung submit setelah data dan bukti dipilih; aksi menerima sekaligus menempatkan dan membuat tagihan, sedangkan menolak mengirim pesan/email. **Severity: High.** Tambahkan ringkasan konfirmasi yang menyebut kelas, jenjang, tagihan, dan pesan yang akan dikirim.
- **R3 — Aksi bukti pembayaran approve/reject berdampingan dan sama-sama dominan.** Keduanya memakai primary dengan inline warna hijau/merah, sehingga panel memiliki beberapa titik perhatian sekaligus. **Severity: Medium.** Gunakan satu primary sesuai keputusan yang sedang disarankan, danger untuk penolakan, dan jelaskan status setelah klik.
- **R4 — Hapus permanen adalah pola terbaik tetapi istilah konfirmasi berbeda dengan modul lain.** Kode referensi dan konsekuensi sudah jelas, namun hanya halaman ini yang memakai friction kuat. **Severity: Medium.** Jadikan ini pola standar untuk semua penghapusan permanen.

### Kelas dan Jadwal

**Files:** `classes/index.blade.php`, `classes/show.blade.php`, `classes/_tabs.blade.php`, `schedule-packages/index.blade.php`, `schedule-packages/create.blade.php`, `schedule-packages/edit.blade.php`, `schedule-packages/_form.blade.php`, `schedule-packages/show.blade.php`.

- **C1 — Hapus kelas memakai pertanyaan singkat.** `Hapus kelas ini?` tidak menjelaskan dampak pada siswa/sesi/riwayat. **Severity: High.** Jelaskan dampak dan gunakan nonaktifkan bila data seharusnya dipertahankan.
- **C2 — Status enrollment pada detail kelas mentah.** `classes/show.blade.php` merender `{{ $enrollment->status }}` sehingga staff dapat melihat `active`, `moved`, atau `ended`. **Severity: Medium.** Pakai badge/status mapper bersama.
- **C3 — Filter auto-submit dan tombol Filter hidup berdampingan.** Dropdown langsung submit, tetapi filter/search tidak selalu memiliki model interaksi yang sama. **Severity: Medium.** Pilih live/auto-apply atau tombol Terapkan secara konsisten dan beri helper text singkat.
- **C4 — Istilah dan kapitalisasi tidak seragam.** `Tambah paket`, `Paket Jadwal`, `Atur paket`, `Detail paket jadwal`, `Kelas & Jadwal`, dan `Level` berganti gaya. **Severity: Low.** Tetapkan sentence case dan istilah tunggal untuk paket jadwal.
- **C5 — Form paket jadwal memuat aturan domain yang mudah terlewat.** Keterangan sesi pagi/Minggu dan Sore/Minggu berada sebagai panel description kecil. **Severity: Medium.** Tampilkan peringatan kontekstual tepat ketika kombinasi hari/sesi tidak valid dan jelaskan dengan bahasa biasa.

### Penempatan/Anggota Kelas

**File:** `enrollments/index.blade.php`, `enrollments/transfer.blade.php`.

- **E1 — Aksi Akhiri sudah memakai konfirmasi, tetapi konsekuensi kurang jelas.** Pesan hanya menyebut mengakhiri penempatan. **Severity: Medium.** Jelaskan apakah riwayat tetap tersimpan, siswa menjadi tanpa kelas, dan apakah bisa dilanjutkan.
- **E2 — Empty state index cukup actionable, tetapi detail tidak menunjukkan status dengan mapper bersama.** Empty state menyebut `Penempatan Baru`, namun halaman memakai istilah sidebar `Anggota Kelas` dan status filter campuran. **Severity: Low–Medium.** Selaraskan nama modul dan status.
- **E3 — Dialog pindah kelas menggunakan warna amber custom melalui inline override.** Konfirmasi perpindahan tampil berbeda dari button system dan tidak menunjukkan tanggal efektif pada ringkasan keputusan. **Severity: Medium.** Tampilkan ringkasan siswa, kelas lama, kelas baru, tanggal berlaku, dan alasan sebelum submit.

### Presensi/Absensi

**Files:** `attendances/index.blade.php`, `attendances/sessions.blade.php`, `attendances/show.blade.php`, `attendances/partials/bulk-roster.blade.php`.

- **A1 — Menutup sesi tidak memiliki konfirmasi.** `Tutup Sesi` mengunci data dan berdasarkan SOP menandai siswa yang belum hadir sebagai Alpa, tetapi form close tidak memakai `confirm()`. **Severity: High.** Wajibkan dialog yang menyebut sesi akan dikunci dan siswa yang belum dicatat dapat menjadi Alpa.
- **A2 — Sesi aktif menampilkan tombol `Tutup` berdampingan dengan `Buka Absensi` tanpa konteks konsekuensi.** Warna danger ada, tetapi label terlalu pendek. **Severity: Medium.** Gunakan `Tutup Sesi` dan helper text status.
- **A3 — Fallback QR memakai placeholder teknis.** `Scan atau masukkan QR token...` dan `Kamera belum aktif` dapat dipahami sebagian, tetapi tidak memberi solusi saat kamera ditolak/QR tidak valid. **Severity: Medium.** Tampilkan pesan operasional: izinkan kamera, gunakan input manual, atau pilih siswa.
- **A4 — Status manual memakai enum yang tidak seragam.** View memakai `excused` sebagai option, report memakai `permission`, dan status backend bisa `absent`/`late`; ini berisiko menyebabkan label atau hasil filter berbeda. **Severity: High.** Satukan enum internal-to-label untuk Hadir, Terlambat, Izin, Sakit, dan Alpa.
- **A5 — Form scan/manual attendance berpotensi padat di mobile.** Input token dan tombol Kirim berada dalam row flex, sementara panel utama memakai dua kolom. **Severity: Medium, inferred.** Pada ≤375px stack input/button dan panel menjadi satu kolom tanpa mengurangi target sentuh.

### Tagihan dan Pembayaran

**Files:** `invoices/index.blade.php`, `invoices/show.blade.php`, `invoices/receipt.blade.php`.

- **I1 — Pembuatan tagihan massal adalah aksi luas dengan konfirmasi browser, tetapi tidak ada ringkasan hasil yang terlihat di view.** Staff perlu tahu berapa tagihan dibuat, dilewati, atau gagal. **Severity: High.** Konfirmasi harus menyebut cakupan, lalu hasil harus menampilkan jumlah sukses/gagal dan langkah berikutnya.
- **I2 — Void pembayaran memakai konfirmasi generik dan alasan hidden tetap.** Form mengirim `Dibatalkan oleh admin setelah verifikasi` sebagai alasan, bukan meminta alasan petugas saat tindakan terjadi. **Severity: High.** Minta alasan eksplisit, tampilkan nominal/siswa/invoice, dan gunakan istilah `Batalkan pembayaran` dengan konsekuensi jelas.
- **I3 — Detail invoice menampilkan jenis tagihan dan metode pembayaran mentah.** `{{ $invoice->type }}` dan `{{ $payment->method }}` dapat muncul sebagai `monthly_fee`, `cash`, atau `other`. **Severity: Medium.** Gunakan label Indonesia yang sama di daftar, detail, kuitansi, dan laporan.
- **I4 — Pembayaran tombol `Bayar` terlalu umum.** Tombol tidak menyebut nominal atau bahwa transaksi akan dicatat. **Severity: Medium.** Gunakan `Simpan Pembayaran` atau `Catat Pembayaran` dan tampilkan total/sisa di dekatnya.
- **I5 — Kolom tanggal diberi label `Tanggal Bayar Terakhir` pada form pembuatan tagihan.** Secara konteks ini sebenarnya tanggal jatuh tempo, sehingga dapat membuat kasir salah mengisi. **Severity: High.** Ganti label menjadi `Tanggal Jatuh Tempo` secara konsisten.

### Keuangan Pusat

**File:** `finance/index.blade.php`.

- **F1 — Kategori transaksi dirender sebagai enum/database value.** Kolom menampilkan `payment`, `partnership`, `facility_rental`, `salary`, dan lainnya tanpa label Indonesia. **Severity: Medium.** Buat mapper kategori ke label staff-facing.
- **F2 — Persetujuan transaksi hanya berupa link-like button kecil di dalam status cell.** `Setujui` mudah terlewat dan tidak menyebut nominal/deskripsi yang akan disetujui. **Severity: Medium.** Sediakan action yang konsisten, tampilkan ringkasan transaksi, dan beri konfirmasi bila approval tidak dapat dibatalkan.
- **F3 — Empty state tidak menjelaskan cara mulai.** `Belum ada transaksi` tidak menyebut `Tambah Transaksi`. **Severity: Low.** Hubungkan empty state ke modal/tombol tambah transaksi.

### Kontrak Tutor dan Penggajian

**Files:** `tutor-contracts/index.blade.php`, `payrolls/index.blade.php`, `payrolls/show.blade.php`, `payrolls/slip.blade.php`.

- **P1 — Menu dan judul tidak sama.** Sidebar `Kontrak Tutor` membuka halaman `Kontrak & Gaji Tutor`; payroll memakai `Penggajian Tutor`. **Severity: Medium.** Pisahkan/namai modul sesuai tujuan dan samakan navigasi.
- **P2 — Approve dan bayar semua gaji adalah tindakan massal berisiko tinggi.** Konfirmasi sudah menjelaskan finalitas, tetapi tombol tetap sangat dominan dan tidak menampilkan jumlah tutor/total nominal tepat di sebelahnya. **Severity: High.** Tampilkan ringkasan jumlah dan total, gunakan konfirmasi dua langkah untuk pembayaran massal, dan beri loading/hasil.
- **P3 — Status payroll fallback masih memakai `ucfirst($period->status)`.** Status selain draft/paid dapat menjadi enum Inggris mentah. **Severity: Medium.** Semua status payroll harus dipetakan ke label Indonesia.
- **P4 — `Dihitung Hari Masuk` bukan istilah yang jelas bagi semua staff.** Ini menjelaskan pro-rata, tetapi tidak langsung menyatakan dampaknya pada honor. **Severity: Low–Medium.** Gunakan `Hari kerja yang dihitung` dengan bantuan singkat tentang perhitungan pro-rata.

### Pengguna, Peran, dan Hak Akses

**Files:** `users/index.blade.php`, `roles/index.blade.php`, `roles/_permission-grid.blade.php`, tutor ID-card views.

- **U1 — Role/permission ditampilkan sebagai istilah teknis.** Contoh `manage_students`, `manage_finance`, dan instruksi nama role tanpa spasi mengharuskan staff memahami konsep permission. **Severity: Medium.** Tampilkan nama sederhana (`Kelola siswa`, `Kelola keuangan`) dan simpan kode internal hanya untuk admin teknis.
- **U2 — Hapus pengguna memakai `Hapus pengguna?` tanpa konsekuensi akses.** Tidak dijelaskan apakah akun dinonaktifkan atau seluruh riwayat dihapus. **Severity: High.** Prefer `Nonaktifkan akun` bila data dipertahankan; konfirmasi harus menyebut dampak login dan data.
- **U3 — Empty state roles dan users tidak memberi jalur berikutnya.** `Belum ada pengguna`/`Belum ada role tambahan` tidak menyebut tombol tambah. **Severity: Low.** Gunakan komponen empty state actionable.
- **U4 — Label peran campur bahasa dan kapitalisasi.** `Staff`, `Tutor`, `Admin`, `Role & Permission`, `Hak Akses (Permissions)` mencampur istilah Indonesia/Inggris. **Severity: Medium.** Tetapkan `Admin`, `Staf`, `Tutor`, `Peran`, dan `Hak Akses` sebagai istilah baku.

### Cabang/Lokasi

**File:** `branches/index.blade.php`.

- **B1 — Hapus cabang ambigu antara hapus dan nonaktifkan.** Konfirmasi berbunyi `menghapus atau menonaktifkan`, sehingga petugas tidak tahu hasil yang akan terjadi. **Severity: High.** Pisahkan aksi `Nonaktifkan` dari `Hapus permanen` atau jelaskan aturan sistem secara spesifik.
- **B2 — Empty state hanya menyatakan belum ada cabang.** Ada tombol Tambah Cabang di atas, tetapi empty state sendiri tidak memberi arahan. **Severity: Low.** Tautkan empty state ke aksi tambah.

### Pengaturan Sistem

**File:** `settings/index.blade.php`.

- **G1 — Group setting memakai key internal sebagai judul.** `{{ $group }}` dapat tampil sebagai nama grup teknis/database, bukan istilah yang mudah dipahami. **Severity: Medium.** Petakan group ke judul operasional dan berikan contoh format/nilai.
- **G2 — Feedback penyimpanan tidak terlihat di halaman.** Form besar hanya memiliki tombol simpan; keberhasilan bergantung pada toast/global session. **Severity: Medium.** Tampilkan notifikasi dekat judul/form dan tandai bagian yang gagal bila validasi tidak lolos.
- **G3 — Field nominal memakai input teks dengan hidden raw value.** Secara visual dapat benar, tetapi ketika validasi gagal atau format tidak valid, staff tidak mendapat penjelasan yang cukup. **Severity: Medium.** Tambahkan format contoh, pesan kesalahan plain language, dan tampilkan nilai yang gagal diproses.

### Laporan

**File:** `reports/index.blade.php`, report PDF templates.

- **L1 — Tombol `Terapkan` primary muncul pada beberapa tab bersama `Unduh PDF`.** Hierarki masih dapat diterima karena konteksnya berbeda, tetapi filter tanggal/bulan tidak auto-apply dan tidak ada `Reset`. **Severity: Medium.** Konsistenkan pola filter, pertahankan konteks tab, dan sediakan reset bila filter dapat tersisa dari sesi sebelumnya.
- **L2 — Kategori transaksi pada laporan masih mentah.** Kolom kategori menampilkan enum seperti pada Keuangan Pusat. **Severity: Medium.** Gunakan mapper bersama untuk tabel dan PDF.
- **L3 — Kolom laporan presensi cukup padat.** Tanggal, siswa, kelas, status, tutor, dan keterangan ditampilkan bersama; pada mobile hampir pasti memerlukan scroll horizontal. **Severity: Medium, inferred.** Sediakan ringkasan responsif atau prioritas kolom.

### Log Aktivitas

**File:** `activity-log/index.blade.php`.

- **AL1 — Deskripsi aktivitas ditampilkan mentah.** `{{ $activity->description }}` dapat berisi event/model/database terminology yang tidak mudah dipahami staff. **Severity: Medium.** Petakan event ke kalimat Indonesia yang menjelaskan siapa melakukan apa terhadap data apa.
- **AL2 — Search memakai placeholder `user` dan tombol `Cari` primary.** Istilah `user` tidak konsisten dengan `Pengguna`, dan pencarian tidak memberi status saat tidak ada hasil. **Severity: Low–Medium.** Ganti menjadi `pengguna`, gunakan feedback hasil kosong yang menjelaskan cara mengubah kata kunci.

### Maintenance Sistem

**File:** `maintenance/index.blade.php`.

- **M1 — Migrasi database adalah istilah developer-facing pada menu operasional.** Deskripsi juga menampilkan perintah `php artisan migrate --force`. **Severity: High.** Sembunyikan perintah teknis dari staff biasa; jelaskan dampak bisnis dan batasi akses ke admin teknis.
- **M2 — Konfirmasi migrasi belum merangkum risiko data dan recovery.** `PERINGATAN KELAS BERAT` terdengar informal dan tidak menjelaskan backup/recovery. **Severity: High.** Ganti dengan peringatan plain language, checklist prasyarat, dan konfirmasi eksplisit.
- **M3 — Clear cache juga memakai istilah sistem tanpa hasil operasional.** Staff diberi tahu cache apa yang dibersihkan, tetapi tidak diberi hasil/indikator proses di layar. **Severity: Medium.** Tampilkan status proses dan hasil, serta jelaskan kapan tindakan ini diperlukan.

### Dokumentasi SOP

**Files:** `documentation/index.blade.php`, `documentation/sop.blade.php`.

- **DOC1 — Dua halaman SOP dengan struktur dan istilah berbeda.** Satu memakai daftar linear, satu memakai workspace accordion; keduanya berisi nomor SOP berbeda dan campuran label nyata/label yang tidak sama dengan view (`Tempatkan Siswa Baru`, `Transfer Kelas`, `Approve`, `Generate Payroll`). **Severity: Medium.** Tetapkan satu sumber SOP dan lakukan validasi otomatis terhadap label tombol aktual.
- **DOC2 — Dokumentasi memperkenalkan banyak istilah teknis ke staff.** `Void Payment`, `Payroll Pro-Rata`, `QR Token`, permission, URL `/login`, dan command migration dapat berguna sebagai glosarium, tetapi terlalu sering muncul dalam langkah kerja. **Severity: Low–Medium.** Tampilkan padanan bahasa biasa terlebih dahulu, istilah teknis sebagai keterangan sekunder.
- **DOC3 — Accordion memakai clickable `div` dan kontrol icon/chevron tanpa semantik button.** Ini berisiko untuk keyboard dan screen reader. **Severity: Medium.** Gunakan button dengan `aria-expanded`, `aria-controls`, dan focus state yang terlihat.
- **DOC4 — Filter role/search hanya mengubah display client-side tanpa empty result state.** Saat tidak ada SOP yang cocok, counter bisa menjadi `0 Prosedur` tanpa instruksi lanjutan. **Severity: Low.** Tampilkan state `Tidak ada SOP cocok` dan opsi menghapus filter.

### Export, print, dan partial views

**Files:** `students/id-card*.blade.php`, `students/partials/*`, `users/tutor-id-card*.blade.php`, `invoices/receipt.blade.php`, `payrolls/slip.blade.php`, `reports/*-pdf.blade.php`, `enrollments/export-pdf.blade.php`, `attendances/partials/bulk-roster.blade.php`.

- **X1 — Template print/PDF perlu diperlakukan sebagai bagian dari pengalaman aksi.** Label cetak berganti antara `Cetak ID Card`, `Buka PDF untuk mencetak`, `Buka PDF untuk cetak`, `Cetak Slip`, dan `Unduh PDF`. **Severity: Low–Medium.** Bedakan secara konsisten `Lihat PDF`, `Unduh PDF`, dan `Cetak` sesuai hasil yang benar-benar terjadi.
- **X2 — Export tidak memiliki state hasil di halaman asal.** Sebagian tombol memakai loading, tetapi hasil download/PDF tidak memberi konfirmasi atau penanganan jika file gagal dibuat. **Severity: Medium.** Tambahkan loading yang menunggu respons dan pesan gagal yang menyebut langkah pemulihan.

## 4. Daftar 10 prioritas teratas

Urutan mempertimbangkan jumlah halaman terdampak dan kemungkinan staff salah klik atau kehilangan kepercayaan pada hasil tindakan.

1. **Satukan feedback submit/hasil proses global — High.** Berlaku hampir semua form create/update/approve/payment. Tampilkan sukses/gagal yang spesifik, plain language, dan actionable.
2. **Amankan semua tindakan finansial dan massal — High.** Fokus pada generate tagihan, bayar invoice, void pembayaran, approve pengeluaran, dan bayar semua payroll: ringkasan objek/nominal, alasan, konfirmasi bertingkat, loading, dan hasil.
3. **Tambahkan konfirmasi yang benar untuk Tutup Sesi — High.** Tutup sesi mengunci presensi dan dapat menandai siswa sebagai Alpa; saat ini tidak ada konfirmasi pada dua layar sesi.
4. **Batasi dan sederhanakan Maintenance — High.** Pisahkan tindakan staff biasa dari migrasi database, hilangkan command developer dari layar kerja, dan gunakan prasyarat/konfirmasi aman.
5. **Buat mapper label terpusat untuk status, tipe, kategori, metode, dan permission — Medium/High.** Ini memperbaiki Student detail, Class detail, Invoice detail, Finance, Payroll, Reports, Roles, dan Activity Log sekaligus.
6. **Tetapkan satu kontrak tombol/komponen admin — Medium.** Hilangkan pencampuran `.btn`/Hope UI/inline color dan tetapkan satu primary per konteks, success/danger/outline yang konsisten.
7. **Samakan nama navigasi dengan judul halaman dan SOP — Medium.** Prioritas pada `Anggota Kelas` vs `Penempatan Kelas`, `Kontrak Tutor` vs `Kontrak & Gaji Tutor`, `Role & Permission`, serta `Paket Jadwal`.
8. **Audit dan perbaiki tabel di viewport 375px — Medium/High.** Fokus pada Data Siswa, Pendaftaran, Keuangan, Tagihan, Presensi, Payroll, dan Laporan; pastikan status/aksi tidak tersembunyi atau terpotong.
9. **Ganti konfirmasi hapus generik dengan pola risiko bertingkat — High.** Terapkan pada siswa, kelas, cabang, pengguna, role, pembayaran, dan pendaftaran; gunakan `Nonaktifkan` bila data sebenarnya dipertahankan.
10. **Satukan dua halaman SOP dan validasi labelnya dengan UI aktual — Medium.** Dokumentasi adalah alat kerja staff, sehingga label yang tidak sama langsung meningkatkan kesalahan navigasi.

## 5. Hal yang sudah berjalan baik

- Sidebar memakai active state dan `aria-current="page"` pada link aktif.
- Banyak tabel menggunakan status badge berwarna dan empty state dasar.
- Komponen form bersama sudah mendukung label, required marker, old value, dan error per field bila dipakai dengan benar.
- Aksi berbahaya tertentu sudah diberi warna merah; penghapusan permanen pendaftaran sudah memiliki penjelasan konsekuensi dan kode konfirmasi yang kuat.
- Export/sinkronisasi tertentu sudah memiliki loading state dan disable saat proses.
- Beberapa halaman memiliki mobile media query, table card overflow, dan panel yang dapat wrap; ini tetap perlu diverifikasi langsung pada 375px.

## 6. Rekomendasi tahap berikutnya

1. Setujui kamus istilah dan matriks button hierarchy.
2. Implementasikan komponen feedback/loading/confirmation bersama.
3. Migrasikan status/kategori/metode/permission ke label mapper.
4. Perbaiki aksi risiko tinggi: finance, payroll, attendance, maintenance, delete.
5. Selaraskan navigasi, SOP, empty state, dan label tombol.
6. Jalankan browser verification pada desktop dan 375px, termasuk keyboard/focus, modal, submit ulang, empty/error/success state, serta console.
