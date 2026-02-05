# Backend - Sistem Manajemen Oma Tempe Ayu

Backend ini dibangun menggunakan **FastAPI** (Python) dan database **MongoDB**.
Berfungsi sebagai API Server yang menangani data pengguna, transaksi, dan laporan.

## 📋 Prasyarat (Requirements)

Pastikan di komputer sudah terinstall:
* **Python** (Versi 3.10 atau terbaru)
* **MongoDB Community Server** (Wajib berjalan di background sebagai Service)

## 🚀 Cara Install (Installation)

1.  **Masuk ke folder backend:**
    ```bash
    cd backend
    ```

2.  **Buat & Aktifkan Virtual Environment (Venv):**
    Supaya library tidak tercampur dengan sistem komputer lain.
    ```bash
    # Untuk Windows
    python -m venv venv
    venv\Scripts\activate
    ```
    *(Tanda berhasil: Ada tulisan `(venv)` di sebelah kiri terminal)*

3.  **Install Dependencies:**
    Download semua library yang dibutuhkan (FastAPI, Uvicorn, Motor, Passlib, dll).
    ```bash
    pip install -r requirements.txt
    ```

4. **jalankan Backend**
    venv\Scripts\activate
    uvicorn server:app --reload 

## ⚙️ Konfigurasi Environment (.env)

Buat file baru bernama **`.env`** di dalam folder `backend`.
Isi dengan konfigurasi berikut:

```env
# Koneksi Database (Lokal)
MONGODB_URL=mongodb://localhost:27017
DB_NAME=oma_tempe_ayu

# Security (Untuk Login/JWT Token)
# Ganti tulisan acak ini dengan password rahasia Anda sendiri
SECRET_KEY=kunci_rahasia_untuk_generate_token_jwt_ganti_ini_biar_aman
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440