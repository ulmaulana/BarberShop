# Sahala Barber - Dokumentasi Teknologi & Keuangan

## Implementasi Komputasi Awan (Cloud Computing)

### Definisi

Proyek Sahala Barber menerapkan **komputasi awan (cloud computing)** dalam arti **seluruh komponen sistem berjalan di infrastruktur cloud publik dan diakses melalui internet**, tanpa server lokal (on-premise). 

Semua bagian utama aplikasi ditempatkan di cloud:
- **Frontend** (React) di-host di **Vercel** (PaaS) dengan CDN dan serverless functions.
- **Backend & Database** menggunakan **Firebase** (BaaS) di Google Cloud (Authentication, Firestore, Cloud Functions).
- **Penyimpanan media** (gambar produk, bukti pembayaran) menggunakan **Cloudinary** (SaaS media cloud).
- **Chatbot AI** berjalan di **Bigmodel API** (SaaS AI) yang diakses melalui endpoint HTTP.

Pengguna hanya perlu koneksi internet dan browser untuk mengakses aplikasi; seluruh komputasi, penyimpanan data, dan pengelolaan infrastruktur ditangani oleh penyedia cloud (Vercel, Firebase, Cloudinary, Bigmodel).

### Layanan Cloud yang Digunakan

| Layanan | Penyedia | Model Layanan | Fungsi |
|---------|----------|---------------|--------|
| **Firebase** | Google Cloud | BaaS (Backend as a Service) | Autentikasi, basis data, fungsi serverless |
| **Vercel** | Vercel Inc. | PaaS (Platform as a Service) | Hosting aplikasi web dan serverless functions untuk API |
| **Cloudinary** | Cloudinary Inc. | SaaS (Software as a Service) | Penyimpanan, manajemen, dan optimasi media/gambar |
| **Bigmodel API** | Zhipu AI | SaaS (Software as a Service) | Layanan kecerdasan buatan untuk chatbot |

### Penerapan Ciri-ciri Utama Cloud Computing

| Ciri-ciri | Penerapan di Sahala Barber |
|-----------|----------------------------|
| **On-demand Self-service** | Admin dan pengguna dapat mengakses layanan kapan saja tanpa perlu menghubungi penyedia. Firebase Console tersedia 24/7 untuk konfigurasi. |
| **Broad Network Access** | Aplikasi dapat diakses dari berbagai perangkat (komputer, smartphone, tablet) melalui browser web. |
| **Resource Pooling** | Sumber daya Firebase (server, database, storage) dikelola terpusat oleh Google dan dibagi antar banyak pengguna secara multi-tenant. |
| **Rapid Elasticity** | Firebase Firestore dan Cloud Functions otomatis menyesuaikan kapasitas sesuai beban (auto-scaling). Tidak perlu konfigurasi manual. |
| **Measured Service** | Pembayaran berdasarkan pemakaian (pay-as-you-go). Firebase menghitung jumlah read/write database, bandwidth storage, dan eksekusi functions. |

### Model Layanan yang Diterapkan

#### 1. BaaS (Backend as a Service) - Firebase
Firebase menyediakan layanan backend lengkap tanpa perlu mengelola server:
- **Firebase Authentication** → Autentikasi pengguna siap pakai
- **Cloud Firestore** → Database NoSQL terkelola
- **Cloud Functions** → Komputasi serverless (FaaS - Function as a Service)

#### 2. PaaS (Platform as a Service) - Vercel
Vercel menyediakan platform hosting dan deployment:
- **Vercel Hosting** → Hosting aplikasi web statis dan SSR
- **Vercel Serverless Functions** → API endpoints tanpa kelola server
- **Vercel Edge Network** → CDN global untuk performa optimal

#### 3. SaaS (Software as a Service)
- **Cloudinary** → Layanan penyimpanan dan manajemen media (gambar, video) siap pakai via API
- **Bigmodel API** → Layanan AI siap pakai untuk chatbot

### Model Penerapan (Deployment Model)

Proyek ini menggunakan **Public Cloud** dimana:
- Semua layanan (Firebase, Vercel, Cloudinary, Bigmodel) dikelola oleh penyedia pihak ketiga
- Infrastruktur dibagi dengan pengguna lain (multi-tenant)
- Akses melalui internet publik
- Tidak ada investasi infrastruktur fisik

### Keuntungan Penerapan Cloud Computing

| Keuntungan | Penjelasan |
|------------|------------|
| **Tanpa Investasi Awal** | Tidak perlu membeli server fisik atau infrastruktur |
| **Skalabilitas Otomatis** | Kapasitas menyesuaikan jumlah pengguna secara dinamis |
| **Biaya Sesuai Pemakaian** | Hanya membayar resource yang digunakan |
| **Ketersediaan Tinggi** | Uptime 99.95% dijamin oleh penyedia (SLA) |
| **Keamanan Terkelola** | Enkripsi, backup, dan keamanan dikelola penyedia |
| **Pembaruan Otomatis** | Tidak perlu maintenance manual untuk infrastruktur |

### Arsitektur Cloud

```
┌─────────────────────────────────────────────────────────────────┐
│                        PENGGUNA                                  │
│            (Browser Web / Aplikasi Mobile)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (Internet)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (PaaS)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Static Hosting + CDN                        │    │
│  │              (Frontend React App)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Serverless Functions (API)                  │    │
│  │  • /api/chat      • /api/stream-chat                    │    │
│  │  • /api/send-notification                               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD PLATFORM                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FIREBASE (BaaS)                       │    │
│  │  ┌───────────────────┐ ┌─────────────────────────────┐  │    │
│  │  │ Auth              │ │ Firestore                   │  │    │
│  │  │ (Autentikasi)     │ │ (Database NoSQL)            │  │    │
│  │  └───────────────────┘ └─────────────────────────────┘  │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │           Cloud Functions (Serverless)          │    │    │
│  │  │  • Notifikasi  • Webhook  • FCM Push            │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
    │                                           │
    ▼                                           ▼
┌───────────────────────┐           ┌───────────────────────┐
│   CLOUDINARY (SaaS)   │           │   BIGMODEL (SaaS)     │
│  • Penyimpanan Media  │           │  • AI Chatbot         │
│  • CDN Gambar         │           │  • GLM-4-Flash        │
│  • Transformasi       │           │                       │
└───────────────────────┘           └───────────────────────┘
```

---

## Ringkasan Teknologi

### Tampilan Depan (Frontend)

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **React** | 18.3.1 | Kerangka kerja antarmuka utama untuk membangun tampilan pengguna dengan pendekatan berbasis komponen |
| **TypeScript** | 5.9.3 | Bahasa pemrograman dengan pengetikan statis untuk keamanan tipe data dan pengalaman pengembang lebih baik |
| **Vite** | 7.2.2 | Alat pembangun modern dengan penggantian modul cepat untuk pengembangan |
| **Tailwind CSS** | 3.4.14 | Kerangka kerja CSS berbasis utilitas untuk penataan gaya cepat dan konsisten |
| **React Router DOM** | 7.9.6 | Navigasi halaman untuk Aplikasi Halaman Tunggal (SPA) |
| **TanStack React Query** | 5.90.9 | Manajemen state server dan pengambilan data dengan penyimpanan sementara otomatis |
| **Recharts** | 3.4.1 | Pustaka grafik berbasis React untuk visualisasi data (grafik garis, diagram lingkaran, diagram batang) |
| **Framer Motion** | 12.23.25 | Pustaka animasi untuk transisi dan interaksi mikro |
| **Lucide React** | 0.556.0 | Pustaka ikon modern |
| **Axios** | 1.7.7 | Klien HTTP untuk permintaan API eksternal |
| **date-fns** | 3.6.0 | Pustaka manipulasi tanggal yang ringan dan modular |
| **clsx** | 2.1.1 | Utilitas untuk penggabungan kelas kondisional |
| **tailwind-merge** | 3.4.0 | Utilitas untuk menggabungkan kelas Tailwind tanpa konflik |
| **tailwindcss-animate** | 1.0.7 | Plugin animasi untuk Tailwind CSS |

### Tampilan Belakang (Backend - Firebase)

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Firebase SDK** | 11.0.2 | SDK utama untuk integrasi Firebase di tampilan depan |
| **Firebase Admin SDK** | 13.6.0 | Operasi admin dengan hak akses tinggi |
| **Firebase Functions** | 7.0.0 | Logika backend tanpa server (notifikasi, obrolan AI) |
| **Node.js** | 20 | Lingkungan runtime untuk Cloud Functions |

**Layanan Firebase:**
| Layanan | Fungsi |
|---------|--------|
| **Firebase Authentication** | Autentikasi pengguna (email/kata sandi), manajemen sesi, kontrol akses berbasis peran |
| **Cloud Firestore** | Basis data NoSQL waktu nyata untuk menyimpan data (pesanan, janji temu, produk, layanan, pengguna, pengeluaran) |

### Layanan Eksternal

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Cloudinary** | - | Penyimpanan media cloud, CDN, dan optimasi gambar (transformasi, kompresi, pengiriman) |
| **Bigmodel API** | - | Obrolan AI untuk bantuan layanan pelanggan (Zhipu AI) |

### Alat Pengembangan

| Alat | Versi | Fungsi |
|------|-------|--------|
| **ESLint** | 9.39.1 | Pemeriksaan kode dan penegakan kualitas |
| **Prettier** | 3.6.2 | Pemformatan kode otomatis |
| **Vitest** | 4.0.9 | Kerangka kerja pengujian unit |
| **PostCSS** | 8.5.6 | Pemrosesan CSS untuk Tailwind |
| **Autoprefixer** | 10.4.22 | Penambahan awalan vendor otomatis untuk CSS |
| **@vercel/node** | 5.5.6 | Runtime untuk Vercel Serverless Functions |

---

## Arsitektur Basis Data (Koleksi Firestore)

```
firestore/
├── users/           # Data pelanggan dan admin
├── orders/          # Pesanan produk
├── appointments/    # Janji temu layanan barbershop
├── products/        # Katalog produk
├── services/        # Daftar layanan (potong rambut, dll)
├── barbers/         # Data tukang cukur
├── expenses/        # Pengeluaran operasional
└── vouchers/        # Voucher diskon
```

---

## Rumus Perhitungan Keuangan

### 0. Pengakuan Pendapatan Berbasis Status

Status pesanan dan janji temu:

- Pesanan: `menunggu_pembayaran` → `dibayar` → `selesai` / `dibatalkan`
- Janji temu: `menunggu` → `dikonfirmasi` → `selesai` / `dibatalkan`

**Pendapatan hanya diakui (masuk ke perhitungan revenue) ketika:**

- Pesanan berstatus `dibayar` atau `selesai`
- Janji temu berstatus `selesai`

Secara matematis:

- **Pendapatan Produk Diakui**
  - Himpunan pesanan terbayar:  
    Sₚ = { pesanan i | statusᵢ ∈ {dibayar, selesai} }
  - Rumus:  
    PendapatanProduk = Σ (totalHargaᵢ), untuk setiap pesanan i ∈ Sₚ

- **Pendapatan Layanan Diakui**
  - Himpunan janji temu selesai:  
    Sₗ = { janji temu j | statusⱼ = selesai }
  - Rumus:  
    PendapatanLayanan = Σ (hargaLayananⱼ), untuk setiap janji temu j ∈ Sₗ

- **Pendapatan Pesanan Belum Diakui (Pending)**
  - Himpunan pesanan menunggu:  
    Pₚ = { pesanan k | statusₖ = menunggu_pembayaran }
  - Rumus:  
    PendapatanPending = Σ (totalHargaₖ), untuk setiap pesanan k ∈ Pₚ

Hanya **PendapatanProduk** dan **PendapatanLayanan** yang masuk ke **Total Pendapatan** di dashboard. **PendapatanPending** hanya ditampilkan sebagai informasi (misalnya kartu "Pembayaran Tertunda") dan tidak masuk ke revenue.

Jika dibatasi pada periode waktu T (misalnya hari ini, minggu ini, dst), maka perhitungan menggunakan filter tanggal:

- PendapatanProduk(T) = Σ totalHargaᵢ untuk i ∈ Sₚ dan tanggalᵢ ∈ T
- PendapatanLayanan(T) = Σ hargaLayananⱼ untuk j ∈ Sₗ dan tanggalⱼ ∈ T

Tanggal yang dipakai mengikuti implementasi aplikasi:

- Pesanan: tanggal `createdAt` / tanggal pembayaran
- Janji temu: tanggal `date` janji temu

---

### 1. Total Pendapatan

**Total Pendapatan = Pendapatan Produk + Pendapatan Layanan**

Dimana (sesuai definisi pengakuan di atas):
- **Pendapatan Produk** = Σ totalHarga pesanan yang statusnya `dibayar` atau `selesai` dalam periode T
- **Pendapatan Layanan** = Σ hargaLayanan dari janji temu yang statusnya `selesai` dalam periode T

Atau ditulis eksplisit:
- **Pendapatan Produk** = Pesanan₁.totalHarga + Pesanan₂.totalHarga + ... + Pesananₙ.totalHarga, dengan setiap pesananᵢ ∈ Sₚ dan tanggalᵢ ∈ T
- **Pendapatan Layanan** = Layanan₁.harga + Layanan₂.harga + ... + Layananₘ.harga, dengan setiap janji temuⱼ ∈ Sₗ dan tanggalⱼ ∈ T

> Hanya pesanan dengan status `selesai` atau `dibayar`, dan janji temu dengan status `selesai` yang dihitung sebagai pendapatan.

---

### 2. Laba Bersih

**Laba Bersih = Total Pendapatan - Total Pengeluaran**

Dimana:
- **Total Pengeluaran** = Pengeluaran₁.jumlah + Pengeluaran₂.jumlah + ... + Pengeluaranₚ.jumlah

> Pengeluaran dalam periode waktu tertentu

---

### 3. Margin Laba

**Margin Laba (%) = (Laba Bersih / Total Pendapatan) x 100**

Kondisi:
- Jika Total Pendapatan = 0, maka Margin Laba = 0

Interpretasi:
- **> 20%** = Margin sehat
- **10-20%** = Margin normal
- **< 10%** = Perlu evaluasi pengeluaran

---

### 4. Rata-rata Nilai Transaksi

**Rata-rata Transaksi = Total Pendapatan / Total Transaksi**

Dimana:
- **Total Transaksi** = Jumlah Pesanan + Jumlah Janji Temu

Kondisi:
- Jika Total Transaksi = 0, maka Rata-rata Transaksi = 0

---

### 5. Pertumbuhan Pendapatan

**Pertumbuhan Pendapatan (%) = ((Pendapatan Saat Ini - Pendapatan Sebelumnya) / Pendapatan Sebelumnya) x 100**

Kondisi:
- Jika Pendapatan Sebelumnya = 0 dan Pendapatan Saat Ini > 0, maka Pertumbuhan = 100%
- Jika Pendapatan Sebelumnya = 0 dan Pendapatan Saat Ini = 0, maka Pertumbuhan = 0%

Periode Perbandingan:
- Periode Saat Ini: 30 hari terakhir
- Periode Sebelumnya: 30 hari sebelumnya

---

### 6. Pendapatan Produk per Item

**Pendapatan Item = Harga x Kuantitas**

**Total Pendapatan Produk = (Harga₁ x Qty₁) + (Harga₂ x Qty₂) + ... + (Hargaₙ x Qtyₙ)**

---

### 7. Pendapatan Layanan per Layanan

**Pendapatan Layanan = Harga Layanan x Total Pemesanan**

**Total Pendapatan Layanan = (HargaLayanan₁ x Pemesanan₁) + (HargaLayanan₂ x Pemesanan₂) + ... + (HargaLayananₘ x Pemesananₘ)**

---

### 8. Rata-rata Nilai Pesanan Produk

**Rata-rata Pesanan Produk = Pendapatan Produk / Jumlah Pesanan Produk**

Kondisi:
- Jika Jumlah Pesanan Produk = 0, maka hasil = 0

---

### 9. Rata-rata Nilai Transaksi Layanan

**Rata-rata Transaksi Layanan = Pendapatan Layanan / Jumlah Janji Temu Selesai**

Kondisi:
- Jika Jumlah Janji Temu Selesai = 0, maka hasil = 0

---

### 10. Persentase Pembagian Pendapatan

**Persentase Produk (%) = (Pendapatan Produk / Total Pendapatan) x 100**

**Persentase Layanan (%) = (Pendapatan Layanan / Total Pendapatan) x 100**

Validasi:
- Persentase Produk + Persentase Layanan = 100%

---

### 11. Rating Kinerja Tukang Cukur

**Rata-rata Rating = (Rating₁ + Rating₂ + ... + Ratingₙ) / n**

Dimana:
- n = Jumlah rating yang diberikan pelanggan
- Rating dalam skala 1-5

Kondisi:
- Jika n = 0 (tidak ada rating), maka Rata-rata Rating = 0

---

### 12. Tingkat Pertumbuhan Pesanan

**Pertumbuhan Pesanan (%) = ((Pesanan Saat Ini - Pesanan Sebelumnya) / Pesanan Sebelumnya) x 100**

Kondisi:
- Jika Pesanan Sebelumnya = 0 dan Pesanan Saat Ini > 0, maka Pertumbuhan = 100%
- Jika Pesanan Sebelumnya = 0 dan Pesanan Saat Ini = 0, maka Pertumbuhan = 0%

---

### 13. Lebar Batang Pengeluaran (Visual)

**Lebar Pengeluaran (%) = (Total Pengeluaran / Total Pendapatan) x 100**

> Digunakan untuk visualisasi batang progres di dasbor

---

### 14. Lebar Batang Laba (Visual)

**Lebar Laba (%) = |Laba Bersih / Total Pendapatan| x 100**

> Nilai absolut digunakan karena laba bisa negatif (rugi)

---

## Fitur Dasbor Keuangan Admin

### 1. Dasbor Keuangan (`/adminpanel/financial`)

| Metrik | Deskripsi |
|--------|-----------|
| Total Pendapatan | Gabungan pendapatan produk + pendapatan layanan |
| Laba Bersih | Pendapatan dikurangi pengeluaran |
| Margin Laba | Persentase laba dari total pendapatan |
| Rata-rata Transaksi | Nilai rata-rata per transaksi selesai |
| Pembagian Pendapatan | Diagram lingkaran perbandingan produk vs layanan |
| Produk Teratas | Peringkat produk berdasarkan pendapatan |
| Layanan Teratas | Peringkat layanan berdasarkan pendapatan |

**Filter Periode:**
- Hari Ini
- Minggu (7 hari terakhir)
- Bulan (30 hari terakhir)
- Tahun (365 hari terakhir)

### 2. Halaman Laporan (`/adminpanel/reports`)

| Jenis Laporan | Data |
|---------------|------|
| Laporan Pendapatan | Grafik pendapatan per periode dengan pembagian |
| Laporan Penjualan | Detail penjualan produk dan layanan |
| Laporan Produk | Performa setiap produk |
| Laporan Layanan | Performa setiap layanan |
| Laporan Tukang Cukur | Performa setiap tukang cukur |

**Ekspor:** CSV dengan format Rupiah Indonesia

### 3. Dasbor Admin (`/adminpanel`)

| Widget | Fungsi |
|--------|--------|
| Kartu Pendapatan | Pendapatan 30 hari + pertumbuhan vs bulan lalu |
| Kartu Transaksi | Jumlah transaksi + pertumbuhan |
| Pembayaran Tertunda | Tautan ke verifikasi pembayaran |
| Rata-rata Transaksi | Nilai rata-rata + perbandingan pertumbuhan |
| Grafik Tren Pendapatan | Grafik garis 30 hari terakhir |
| Produk Teratas | 3 produk terlaris |
| Layanan Teratas | 3 layanan terlaris |
| Transaksi Terbaru | Daftar transaksi terbaru (waktu nyata) |

---

## Alur Status Pesanan & Janji Temu

### Alur Status Pesanan
```
menunggu_pembayaran -> dibayar -> selesai
                             \-> dibatalkan
```

### Alur Status Janji Temu
```
menunggu -> dikonfirmasi -> selesai
                        \-> dibatalkan
```

**Catatan:** Hanya status `selesai` atau `dibayar` yang dihitung dalam pendapatan.

---

## Periode Perhitungan

| Periode | Rentang |
|---------|---------|
| Hari Ini | Hari ini (00:00 - sekarang) |
| Minggu | 7 hari terakhir |
| Bulan | 30 hari terakhir |
| Tahun | 365 hari terakhir |

---

## Ringkasan

Sistem keuangan Sahala Barber menggunakan pendekatan **pendapatan dua aliran**:
1. **Penjualan Produk** - Dari pembelian produk (koleksi pesanan)
2. **Pendapatan Layanan** - Dari pemesanan layanan (koleksi janji temu)

Semua perhitungan keuangan menggunakan data waktu nyata dari Firestore dengan penyimpanan sementara untuk optimasi performa.
