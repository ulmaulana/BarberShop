# Sahala Barber Management System

Sistem manajemen barbershop modern dan lengkap yang dibangun dengan React, Firebase, dan Cloudinary.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Screenshot



---

## Fitur

### Portal Pelanggan
- **Landing Page** - Homepage modern dan profesional
- **Booking Layanan** - Sistem booking appointment multi-step
- **Toko Produk** - Jelajah dan beli produk perawatan rambut
- **Keranjang Belanja** - Fungsionalitas keranjang e-commerce lengkap
- **Checkout** - Pembayaran QRIS dengan upload bukti transfer
- **Appointment Saya** - Lihat dan kelola janji temu
- **Pesanan Saya** - Lacak status dan riwayat pesanan
- **Profil Pengguna** - Kelola pengaturan akun

### Dashboard Admin
- **Dashboard Analitik** - Metrik bisnis real-time
- **Manajemen Layanan** - Operasi CRUD untuk layanan
- **Manajemen Produk** - Inventori dan katalog produk
- **Manajemen Appointment** - Lihat dan kelola booking
- **Manajemen Pesanan** - Proses dan lacak pesanan
- **Verifikasi Pembayaran** - Setujui/tolak bukti pembayaran
- **Manajemen Pengguna** - Kelola pelanggan dan staff
- **Laporan** - Laporan keuangan dan operasional

### Autentikasi & Keamanan
- Autentikasi Email/Password via Firebase Auth
- Kontrol akses berbasis role (Customer, Admin, Barber, Cashier, Owner)
- Protected routes dan API endpoints
- Manajemen environment variable yang aman

### Backend & Storage
- **Firestore Database** - Database NoSQL real-time
- **Cloud Storage** - Upload file via Firebase Storage
- **Integrasi Cloudinary** - Pengiriman gambar yang dioptimalkan
- **Cloud Functions** - Logika backend serverless

---

## Tech Stack

### Frontend
- **React 18** - Framework UI
- **TypeScript** - JavaScript dengan type-safe
- **Vite** - Build tool yang cepat
- **Tailwind CSS** - Framework CSS utility-first
- **React Router v6** - Routing client-side
- **Firebase SDK** - Authentication & Firestore

### Backend
- **Firebase Authentication** - Manajemen pengguna
- **Cloud Firestore** - Database NoSQL
- **Cloud Storage** - Penyimpanan file
- **Cloud Functions** - Fungsi serverless
- **Cloudinary** - CDN gambar dan optimasi

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Git** - Version control
- **Firebase CLI** - Deployment dan emulator

---

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- **Node.js** v18+ terinstall
- **npm** atau **yarn** package manager
- **Git** untuk version control
- **Akun Firebase** (tier gratis sudah cukup)
- **Akun Cloudinary** (tier gratis sudah cukup)

---

## Memulai

### 1. Clone Repository

```bash
git clone https://github.com/ulmaulana/BarberShop.git
cd E-BarberShop
```

### 2. Setup Environment Variables

Lihat instruksi detail di [SETUP.md](./SETUP.md)

```bash
# Copy template environment
cp .env.example .env
cp .firebaserc.example .firebaserc
cd frontend && cp .env.example .env
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Firebase Functions
cd ../firebase/functions
npm install
```

### 4. Konfigurasi Firebase

```bash
# Login ke Firebase
firebase login

# Pilih project Anda
firebase use --add
```

### 5. Jalankan Development Server

```bash
# Frontend (dari direktori frontend)
npm run dev
# Buka http://localhost:5173
```

---

## Struktur Project

```
sahala-barber/
├── .gitignore              # Aturan Git ignore
├── .env.example            # Template environment variables
├── .firebaserc.example     # Template konfigurasi Firebase
├── README.md               # File ini
├── SETUP.md                # Panduan setup detail
├── firebase.json           # Konfigurasi Firebase
├── firestore.rules         # Aturan keamanan Firestore
├── firestore.indexes.json  # Index Firestore
│
├── frontend/               # Aplikasi frontend React
│   ├── src/
│   │   ├── components/    # Komponen UI yang dapat digunakan ulang
│   │   ├── pages/         # Komponen halaman
│   │   ├── contexts/      # React contexts (Auth, Toast)
│   │   ├── config/        # Konfigurasi Firebase & aplikasi
│   │   ├── services/      # Layanan API (Firebase, Cloudinary)
│   │   ├── utils/         # Fungsi utilitas
│   │   ├── types/         # Definisi tipe TypeScript
│   │   └── router.tsx     # Konfigurasi React Router
│   ├── public/            # Aset statis
│   ├── .env.example       # Template environment frontend
│   └── package.json       # Dependencies frontend
│
├── firebase/              # Backend Firebase
    └── functions/         # Cloud Functions
        ├── src/           # Source code fungsi
        └── package.json   # Dependencies fungsi
```

---

## Keamanan & Privasi

Project ini mengimplementasikan berbagai langkah keamanan:

### Environment Variables
- Semua kredensial sensitif ada di file `.env`
- File `.env` dikecualikan dari Git via `.gitignore`
- Template `.env.example` sebagai referensi

### Keamanan Firebase
- Aturan keamanan Firestore diterapkan
- Aturan Cloud Storage dikonfigurasi
- Autentikasi diperlukan untuk protected routes
- Kontrol akses berbasis role (RBAC)

### Best Practices
- Tidak ada kredensial hardcoded di source code
- HTTPS-only di production
- Validasi dan sanitasi input
- Update dependency secara berkala

**JANGAN PERNAH commit:**
- File `.env`
- Firebase service account keys
- API secrets atau kredensial
- `.firebaserc` dengan project ID asli

## Testing

```bash
# Test frontend
cd frontend
npm run test

# Pemeriksaan lint
npm run lint

# Pemeriksaan tipe
npm run type-check
```

---

## Deployment

### Firebase Hosting

```bash
# Build frontend
cd frontend
npm run build

# Deploy ke Firebase
cd ..
firebase deploy
```

### Deploy Layanan Tertentu

```bash
# Deploy hosting saja
firebase deploy --only hosting

# Deploy functions saja
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

## Kontribusi

Kontribusi sangat diterima! Silakan ikuti panduan berikut:

1. **Fork** repository ini
2. **Buat** feature branch (`git checkout -b feature/FiturBaru`)
3. **Commit** perubahan Anda (`git commit -m 'Menambahkan fitur baru'`)
4. **Push** ke branch (`git push origin feature/FiturBaru`)
5. **Buka** Pull Request
---

## Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

**Made with ❤️ by Maulana**
