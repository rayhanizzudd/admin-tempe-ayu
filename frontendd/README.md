# Frontend - Sistem Manajemen Oma Tempe Ayu

Frontend ini dibangun menggunakan **React + Vite** (migrasi dari CRA) dan menggunakan **Tailwind CSS v3** untuk styling.

## 📋 Prasyarat (Requirements)

Pastikan di komputer sudah terinstall:
* **Node.js** (Versi 18 atau terbaru disarankan)
* **Backend FastAPI** harus sudah berjalan di port `8000`.

## 🚀 Cara Install (Installation)

1.  **Masuk ke folder frontend:**
    ```bash
    cd frontend
    ```

2.  **Install semua library:**
    Jalankan perintah ini untuk mengunduh semua dependency yang dibutuhkan (React, Vite, Tailwind, Recharts, dll).
    ```bash
    npm install
    ```

## ⚙️ Konfigurasi Environment (.env)

Buat file baru bernama **`.env`** di dalam folder `frontend`.
Isi file tersebut dengan konfigurasi berikut agar bisa terhubung ke backend:

```env
# URL Backend FastAPI (Lokal)
VITE_BACKEND_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)

# Opsional: Matikan health check jika tidak dipakai
VITE_ENABLE_HEALTH_CHECK=false