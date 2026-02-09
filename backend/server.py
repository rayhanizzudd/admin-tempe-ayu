from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-juragan-tempe-ayu-2025')
ALGORITHM = "HS256"

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class KategoriPembeli(str, Enum):
    grosir = "Grosir"
    eceran = "Eceran"

class StatusPembayaran(str, Enum):
    lunas = "Lunas"
    tempo = "Tempo"

class KategoriPengeluaran(str, Enum):
    kedelai = "kedelai"
    plastik = "plastik"
    ragi = "ragi"
    air = "air"
    listrik = "listrik"
    gaji = "gaji karyawan"

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

class PenjualanCreate(BaseModel):
    tanggal: date
    pembeli: str
    tanggal_penjualan: Optional[date] = None
    kategori_pembeli: KategoriPembeli
    tempe_3k_pcs: int = 0
    tempe_5k_pcs: int = 0
    tempe_10k_pcs: int = 0
    status_pembayaran: StatusPembayaran

class Penjualan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
    tanggal_penjualan: Optional[str] = None
    pembeli: str
    kategori_pembeli: str
    tempe_3k_pcs: int
    tempe_5k_pcs: int
    tempe_10k_pcs: int
    subtotal_3k: int
    subtotal_5k: int
    subtotal_10k: int
    total_penjualan: int
    status_pembayaran: str
    created_at: str

class ReturnPenjualanCreate(BaseModel):
    tanggal: date
    penjualan_id: str
    tempe_3k_return: int = 0
    tempe_5k_return: int = 0
    tempe_10k_return: int = 0
    keterangan: str = ""

class ReturnPenjualan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
    penjualan_id: str
    tempe_3k_return: int
    tempe_5k_return: int
    tempe_10k_return: int
    total_return: int
    keterangan: str
    created_at: str

class ProduksiHarianCreate(BaseModel):
    tanggal: date
    kedelai_kg: float
    tempe_3k_produksi: int = 0
    tempe_5k_produksi: int = 0
    tempe_10k_produksi: int = 0
    pekerja: List[str] = []                  

class ProduksiHarian(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
    kedelai_kg: float
    tempe_3k_produksi: int
    tempe_5k_produksi: int
    tempe_10k_produksi: int
    total_produksi: int
    pekerja: str
    stat_exp: bool = False
    jumlah_pekerja: int      # Dihitung dari tabel gaji
    nama_pekerja: List[str]  # Diambil dari tabel gaji -> karyawan

class StatusExpUpdate(BaseModel):
    stat_exp: bool

class StokSummary(BaseModel):
    stok_3k: int
    stok_5k: int
    stok_10k: int
    total_pcs: int
    last_updated: str

class RiwayatStokHarian(BaseModel):
    tanggal: str
    masuk_pcs: int   # Produksi + Return
    keluar_pcs: int  # Penjualan
    sisa_stok_3k: int
    sisa_stok_5k: int
    sisa_stok_10k: int
    total_sisa_stok: int

class PengeluaranCreate(BaseModel):
    tanggal: date
    kategori_pengeluaran: KategoriPengeluaran
    jumlah: int
    keterangan: str = ""

class Pengeluaran(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
    kategori_pengeluaran: str
    jumlah: int
    keterangan: str
    created_at: str

class DashboardSummary(BaseModel):
    total_produksi_hari_ini: int
    total_penjualan_hari_ini: int
    total_pengeluaran_hari_ini: int
    laba_hari_ini: int

class LaporanLabaItem(BaseModel):
    tanggal: str
    omzet: int
    pengeluaran: int
    laba: int

class KaryawanCreate(BaseModel):
    nama: str
    nomor: str
    gaji_harian: int # Gaji per hari
    status_aktif: bool = True

class KaryawanUpdate(BaseModel):
    nama: str
    nomor: str
    gaji_harian: int
    status_aktif: bool

class Karyawan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    id_user: str # Relasi ke tabel users
    nama: str
    nomor: str
    gaji_harian: int
    status_aktif: bool
    created_at: str

# class Gaji(BaseModel):
#     model_config = ConfigDict(extra="ignore")
#     id: str
#     id_produksi: str
#     id_karyawan: str
#     nama_karyawan: str = "" # Helper field untuk frontend
#     tanggal_produksi: str = "" # Helper field untuk frontend
#     nominal: int # 0 berarti belum dibayar
#     status_bayar: bool # False = Belum, True = Sudah
#     created_at: str

class Gaji(BaseModel):
    id: str
    id_produksi: str
    id_karyawan: str
    nama_karyawan: str = "Unknown"
    tanggal_produksi: str = "Unknown"
    nominal: int = 0
    nominal_standar: int = 0  # <--- Field baru untuk tampilan awal
    status_bayar: bool = False
    created_at: str


class BayarBatchRequest(BaseModel):
    ids: List[str]          # List ID gaji yang mau dibayar
    total_nominal: int      # Total uang yang dikeluarkan
    nama_karyawan: str      # Nama karyawan (untuk keterangan)
    
# Helper functions
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Initialize admin user
async def init_admin():
    existing = await db.users.find_one({"username": "admin"}, {"_id": 0})
    if not existing:
        hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
        await db.users.insert_one({
            "username": "admin",
            "password": hashed.decode('utf-8')
        })

# from pydantic import BaseModel
from typing import List
import uuid
from datetime import datetime
# Routes
# 2. Buat Endpoint Baru
@api_router.post("/gaji/bayar-batch")
async def bayar_gaji_batch(payload: BayarBatchRequest, user: dict = Depends(verify_token)):
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Tidak ada data gaji yang dipilih")

    # A. Update Status Gaji Karyawan (Menjadi Lunas/Paid)
    await db.gaji.update_many(
        {"id": {"$in": payload.ids}},
        {"$set": {"status_bayar": True}}
    )

    # B. OTOMATIS CATAT KE PENGELUARAN
    # Pastikan Anda sudah punya collection 'pengeluaran' di DB
    pengeluaran_doc = {
        "id": str(uuid.uuid4()),
        "tanggal": datetime.now().isoformat(), # Tanggal hari ini
        "kategori_pengeluaran": "gaji",        # Kategori otomatis 'gaji'
        "jumlah": payload.total_nominal,       # Nominal dari frontend
        "keterangan": f"Gaji a.n {payload.nama_karyawan} ({len(payload.ids)} hari kerja)",
        "created_at": datetime.now().isoformat(),
        "user_id": user.get("id") # Opsional: siapa yang input
    }
    
    await db.pengeluaran.insert_one(pengeluaran_doc)

    return {"message": "Pembayaran berhasil dan tercatat di pengeluaran"}

@api_router.post("/karyawan", response_model=Karyawan)
async def create_karyawan(data: KaryawanCreate, _: dict = Depends(verify_token)):
    import uuid
    
    # 1. Buat User Baru (Username = Nama, Password = 12345678)
    # Sanitasi username (hapus spasi, lowercase) agar aman
    username = data.nama.lower().replace(" ", "")
    hashed_password = bcrypt.hashpw("12345678".encode('utf-8'), bcrypt.gensalt())
    
    # Cek username ganda
    existing_user = await db.users.find_one({"username": username})
    if existing_user:
        raise HTTPException(status_code=400, detail=f"Username '{username}' sudah digunakan. Gunakan nama lain.")

    user_id = await db.users.insert_one({
        "username": username,
        "password": hashed_password.decode('utf-8'),
        "role": "karyawan" # Opsional: jika ingin membedakan role
    })

    # 2. Buat Data Karyawan
    karyawan_doc = {
        "id": str(uuid.uuid4()),
        "id_user": str(user_id.inserted_id),
        "nama": data.nama,
        "nomor": data.nomor,
        "gaji_harian": data.gaji_harian,
        "status_aktif": data.status_aktif,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.karyawan.insert_one(karyawan_doc)
    return Karyawan(**karyawan_doc)

@api_router.get("/karyawan", response_model=List[Karyawan])
async def get_karyawan(_: dict = Depends(verify_token)):
    karyawan_list = await db.karyawan.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Karyawan(**k) for k in karyawan_list]

@api_router.put("/karyawan/{id_karyawan}", response_model=Karyawan)
async def update_karyawan(id_karyawan: str, data: KaryawanUpdate, _: dict = Depends(verify_token)):
    # Cek exist
    existing = await db.karyawan.find_one({"id": id_karyawan})
    if not existing:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    update_data = {
        "nama": data.nama,
        "nomor": data.nomor,
        "gaji_harian": data.gaji_harian,
        "status_aktif": data.status_aktif
    }
    
    await db.karyawan.update_one({"id": id_karyawan}, {"$set": update_data})
    return {**existing, **update_data}


@api_router.get("/gaji", response_model=List[Gaji])
async def get_gaji(_: dict = Depends(verify_token)):
    # 1. Ambil data gaji
    gaji_list = await db.gaji.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    if not gaji_list:
        return []

    # 2. Siapkan ID untuk Lookup
    prod_ids = list(set([g['id_produksi'] for g in gaji_list]))
    karyawan_ids = list(set([g['id_karyawan'] for g in gaji_list]))

    # 3. Lookup Data
    produksis = await db.produksi_harian.find({"id": {"$in": prod_ids}}).to_list(1000)
    karyawans = await db.karyawan.find({"id": {"$in": karyawan_ids}}).to_list(1000)

    prod_map = {p['id']: p['tanggal'] for p in produksis}
    
    # Map Karyawan: Simpan object lengkap untuk ambil gaji_harian
    karyawan_map = {k['id']: k for k in karyawans} 

    hasil = []
    for g in gaji_list:
        # Ambil data karyawan terkait
        ky = karyawan_map.get(g['id_karyawan'])
        
        g['nama_karyawan'] = ky['nama'] if ky else "Unknown"
        g['tanggal_produksi'] = prod_map.get(g['id_produksi'], "Unknown")
        
        # LOGIKA TAMPILAN:
        # Kirimkan gaji_harian master sebagai 'nominal_standar' agar bisa tampil di FE
        g['nominal_standar'] = ky['gaji_harian'] if ky else 0
        
        hasil.append(Gaji(**g))
    
    return sorted(hasil, key=lambda x: x.tanggal_produksi, reverse=True)


# ENDPOINT BARU: VERIFIKASI (Tombol Selesai di Tabel)
# Gunanya: Mengunci nominal ke DB dan memasukkannya ke antrian Card Akumulasi
@api_router.patch("/gaji/{id_gaji}/verifikasi")
async def verifikasi_gaji(id_gaji: str, _: dict = Depends(verify_token)):
    # Cari Gaji
    gaji_doc = await db.gaji.find_one({"id": id_gaji})
    if not gaji_doc:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")

    # Cari Master Karyawan untuk kunci nominal
    karyawan = await db.karyawan.find_one({"id": gaji_doc['id_karyawan']})
    if not karyawan:
        raise HTTPException(status_code=404, detail="Master karyawan tidak ditemukan")

    nominal_fix = karyawan['gaji_harian']

    # Update: Isi nominal (artinya sudah diverifikasi), tapi status_bayar TETAP FALSE
    await db.gaji.update_one(
        {"id": id_gaji},
        {"$set": {"nominal": nominal_fix}}
    )
    return {"message": "Gaji diverifikasi", "nominal": nominal_fix}


# ENDPOINT UPDATE: BAYAR (Tombol Bayar di Card)
# Gunanya: Melunasi gaji yang sudah diverifikasi
@api_router.patch("/gaji/{id_gaji}/bayar")
async def bayar_gaji(id_gaji: str, _: dict = Depends(verify_token)):
    # Set status_bayar jadi True
    await db.gaji.update_one(
        {"id": id_gaji},
        {"$set": {"status_bayar": True}}
    )
    return {"message": "Gaji lunas"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah")
    
    if not bcrypt.checkpw(request.password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    
    token = jwt.encode({"username": user['username']}, SECRET_KEY, algorithm=ALGORITHM)
    return LoginResponse(token=token, username=user['username'])

@api_router.get("/dashboard/summary")
async def get_dashboard_summary(tanggal: Optional[str] = None, _: dict = Depends(verify_token)):
    if not tanggal:
        tanggal = date.today().isoformat()
    
    # 1. Total produksi hari ini (Tetap)
    produksi = await db.produksi_harian.find_one({"tanggal": tanggal}, {"_id": 0})
    total_produksi = produksi['total_produksi'] if produksi else 0
    
    # 2. Ambil semua data penjualan hari ini
    penjualan_list = await db.penjualan.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    
    # --- PERBAIKAN DISINI ---
    # Hitung terpisah antara LUNAS (Uang Masuk) dan TEMPO (Piutang)
    total_uang_masuk = 0
    total_piutang = 0 # Opsional: jika nanti ingin ditampilkan di dashboard
    
    for p in penjualan_list:
        # Pastikan field status ada, default ke Lunas jika data lama tidak punya status
        status = p.get('status_pembayaran', 'Lunas') 
        
        if status == 'Lunas':
            total_uang_masuk += p['total_penjualan']
        else:
            total_piutang += p['total_penjualan']

    # 3. Total return hari ini (Tetap)
    # Asumsi: Return mengurangi uang kas
    return_list = await db.return_penjualan.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    total_return = sum(r['total_return'] for r in return_list)
    
    # 4. Total pengeluaran hari ini (Tetap)
    pengeluaran_list = await db.pengeluaran.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    total_pengeluaran = sum(p['jumlah'] for p in pengeluaran_list)
    
    # 5. Hitung Omzet & Laba (CASH BASIS)
    # Omzet sekarang hanya menghitung uang yang statusnya LUNAS dikurangi Return
    omzet_bersih = total_uang_masuk - total_return
    
    # Laba = Omzet Bersih - Pengeluaran
    laba_bersih = omzet_bersih - total_pengeluaran
    
    return DashboardSummary(
        total_produksi_hari_ini=total_produksi,
        total_penjualan_hari_ini=omzet_bersih, # Ini sekarang hanya menampilkan Cash In
        total_pengeluaran_hari_ini=total_pengeluaran,
        laba_hari_ini=laba_bersih
    )
@api_router.post("/penjualan", response_model=Penjualan)
async def create_penjualan(data: PenjualanCreate, _: dict = Depends(verify_token)):
    # --- LOGIKA BARU HARGA BERDASARKAN KATEGORI ---
    
    # Default harga (Eceran)
    harga_3k = 3000
    harga_5k = 5000
    harga_10k = 10000

    # Jika Grosir, ubah harga tertentu
    if data.kategori_pembeli == KategoriPembeli.grosir:
        harga_3k = 2500
        harga_5k = 4000
        # Harga 10k tetap 10000 sesuai request ("lainnya tetap sama")
    
    # Hitung subtotal menggunakan harga dinamis
    subtotal_3k = data.tempe_3k_pcs * harga_3k
    subtotal_5k = data.tempe_5k_pcs * harga_5k
    subtotal_10k = data.tempe_10k_pcs * harga_10k
    
    total_penjualan = subtotal_3k + subtotal_5k + subtotal_10k
    # ---------------------------------------------
    print("===============================================================================")
    print("===============================================================================")
    print(data)
    
    import uuid
    doc = {
        "id": str(uuid.uuid4()),
        "tanggal": data.tanggal.isoformat(),
        "tanggal_penjualan": data.tanggal_penjualan.isoformat() if data.tanggal_penjualan else None,
        "pembeli": data.pembeli,
        "kategori_pembeli": data.kategori_pembeli.value,
        "tempe_3k_pcs": data.tempe_3k_pcs,
        "tempe_5k_pcs": data.tempe_5k_pcs,
        "tempe_10k_pcs": data.tempe_10k_pcs,
        "subtotal_3k": subtotal_3k,
        "subtotal_5k": subtotal_5k,
        "subtotal_10k": subtotal_10k,
        "total_penjualan": total_penjualan,
        "status_pembayaran": data.status_pembayaran.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.penjualan.insert_one(doc)
    return Penjualan(**doc)

@api_router.patch("/penjualan/{id_penjualan}/toggle-status", response_model=Penjualan)
async def toggle_status_penjualan(id_penjualan: str, _: dict = Depends(verify_token)):
    # 1. Cari data penjualan berdasarkan ID
    existing_penjualan = await db.penjualan.find_one({"id": id_penjualan}, {"_id": 0})
    
    if not existing_penjualan:
        raise HTTPException(status_code=404, detail="Data penjualan tidak ditemukan")

    # 2. Logika Toggle (Tempo <-> Lunas)
    current_status = existing_penjualan.get("status_pembayaran")
    new_status = None

    # Asumsi: Enum StatusPembayaran memiliki value "Lunas" dan "Tempo"
    # Sesuaikan string "Tempo" dan "Lunas" dengan value persis di Enum Anda jika berbeda
    if current_status == StatusPembayaran.tempo.value:
        new_status = StatusPembayaran.lunas.value
    else:
        # Jika status Lunas (atau lainnya), ubah jadi Tempo
        new_status = StatusPembayaran.tempo.value

    # 3. Update database
    await db.penjualan.update_one(
        {"id": id_penjualan},
        {"$set": {"status_pembayaran": new_status}}
    )

    # 4. Update object di memory untuk return response yang akurat tanpa query ulang
    existing_penjualan["status_pembayaran"] = new_status
    
    return Penjualan(**existing_penjualan)

@api_router.get("/penjualan", response_model=List[Penjualan])
async def get_penjualan(_: dict = Depends(verify_token)):
    penjualan_list = await db.penjualan.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    return [Penjualan(**p) for p in penjualan_list]

@api_router.post("/return", response_model=ReturnPenjualan)
async def create_return(data: ReturnPenjualanCreate, _: dict = Depends(verify_token)):
    # Verify penjualan exists
    penjualan = await db.penjualan.find_one({"id": data.penjualan_id}, {"_id": 0})
    if not penjualan:
        raise HTTPException(status_code=404, detail="Penjualan tidak ditemukan")
    
    # --- LOGIKA BARU RETURN BERDASARKAN KATEGORI ASAL ---
    
    # Cek kategori dari data penjualan aslinya
    kategori_asal = penjualan.get('kategori_pembeli')
    
    # Set harga default (Eceran / Legacy data)
    harga_3k = 3000
    harga_5k = 5000
    harga_10k = 10000

    # Jika pembelian aslinya adalah Grosir, gunakan harga grosir
    if kategori_asal == "Grosir":
        harga_3k = 2500
        harga_5k = 4000
        # Harga 10k tetap
    
    # Calculate total return menggunakan harga yang sesuai
    total_return = (data.tempe_3k_return * harga_3k) + \
                   (data.tempe_5k_return * harga_5k) + \
                   (data.tempe_10k_return * harga_10k)
    # ----------------------------------------------------
    
    import uuid
    doc = {
        "id": str(uuid.uuid4()),
        "tanggal": data.tanggal.isoformat(),
        "penjualan_id": data.penjualan_id,
        "tempe_3k_return": data.tempe_3k_return,
        "tempe_5k_return": data.tempe_5k_return,
        "tempe_10k_return": data.tempe_10k_return,
        "total_return": total_return,
        "keterangan": data.keterangan,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.return_penjualan.insert_one(doc)
    return ReturnPenjualan(**doc)

@api_router.get("/return", response_model=List[ReturnPenjualan])
async def get_return(_: dict = Depends(verify_token)):
    return_list = await db.return_penjualan.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    return [ReturnPenjualan(**r) for r in return_list]

# --- [UPDATE MODEL] ---

# Model untuk INPUT (Create)
class ProduksiHarianCreate(BaseModel):
    tanggal: date
    kedelai_kg: float
    tempe_3k_produksi: int = 0
    tempe_5k_produksi: int = 0
    tempe_10k_produksi: int = 0
    pekerja: List[str] = [] # Array ID Karyawan (hanya untuk trigger buat gaji)

# Model untuk OUTPUT (Read/Response)
class ProduksiHarianResponse(BaseModel):
    id: str
    tanggal: str
    kedelai_kg: float
    tempe_3k_produksi: int
    tempe_5k_produksi: int
    tempe_10k_produksi: int
    total_produksi: int
    stat_exp: bool
    # Field tambahan (Computed Fields)
    jumlah_pekerja: int      # Dihitung dari tabel gaji
    nama_pekerja: List[str]  # Diambil dari tabel gaji -> karyawan
    paid_karyawan_ids: List[str] = []
    created_at: str

# --- [UPDATE ENDPOINT POST] ---
@api_router.post("/produksi", response_model=ProduksiHarianResponse)
async def create_produksi(data: ProduksiHarianCreate, _: dict = Depends(verify_token)):
    # 1. Validasi Tanggal
    cek_tanggal = await db.produksi_harian.find_one({"tanggal": data.tanggal.isoformat()})
    if cek_tanggal:
        raise HTTPException(status_code=400, detail=f"Data produksi tanggal {data.tanggal} sudah ada!")

    import uuid
    prod_id = str(uuid.uuid4())
    
    # 2. Simpan Produksi (TANPA DATA PEKERJA SAMA SEKALI)
    doc_prod = {
        "id": prod_id,
        "tanggal": data.tanggal.isoformat(),
        "kedelai_kg": data.kedelai_kg,
        "tempe_3k_produksi": data.tempe_3k_produksi,
        "tempe_5k_produksi": data.tempe_5k_produksi,
        "tempe_10k_produksi": data.tempe_10k_produksi,
        "total_produksi": (data.tempe_3k_produksi + data.tempe_5k_produksi + data.tempe_10k_produksi),
        "stat_exp": False,
        "created_at": datetime.now(timezone.utc).isoformat()
        # Field 'jumlah_pekerja' dan 'pekerja' TIDAK DISIMPAN DISINI
    }
    await db.produksi_harian.insert_one(doc_prod)

    # 3. Simpan Gaji (Relasi: id_produksi -> id_karyawan)
    docs_gaji = []
    nama_pekerja_list = [] # Hanya untuk response balik sesaat
    
    if data.pekerja:
        # Ambil nama karyawan untuk response balik (opsional)
        karyawans = await db.karyawan.find({"id": {"$in": data.pekerja}}).to_list(1000)
        nama_map = {k['id']: k['nama'] for k in karyawans}

        for id_karyawan in data.pekerja:
            docs_gaji.append({
                "id": str(uuid.uuid4()),
                "id_produksi": prod_id,
                "id_karyawan": id_karyawan,
                "nominal": 0, 
                "status_bayar": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            if id_karyawan in nama_map:
                nama_pekerja_list.append(nama_map[id_karyawan])
    
        await db.gaji.insert_many(docs_gaji)
    
    # Return data (gabungkan data db + data barusan untuk response)
    return {
        **doc_prod, 
        "jumlah_pekerja": len(docs_gaji),
        "nama_pekerja": nama_pekerja_list
    }

# --- [UPDATE ENDPOINT GET - INI YANG PALING PENTING] ---
@api_router.get("/produksi", response_model=List[ProduksiHarianResponse])
async def get_produksi(_: dict = Depends(verify_token)):
    # 1. Ambil Semua Data Produksi
    produksi_list = await db.produksi_harian.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    if not produksi_list: return []

    prod_ids = [p['id'] for p in produksi_list]

    # 2. Ambil Data Gaji
    gaji_list = await db.gaji.find({"id_produksi": {"$in": prod_ids}}).to_list(2000)
    
    karyawan_ids = list(set([g['id_karyawan'] for g in gaji_list]))
    karyawan_list = await db.karyawan.find({"id": {"$in": karyawan_ids}}).to_list(1000)
    
    karyawan_map = {k['id']: k['nama'] for k in karyawan_list}
    
    # Map Helper
    prod_worker_map = {} 
    prod_paid_map = {} # <--- Map baru untuk menyimpan siapa yang sudah lunas
    
    for g in gaji_list:
        pid = g['id_produksi']
        kid = g['id_karyawan']
        nama = karyawan_map.get(kid, "Unknown")
        
        # Logic Nama
        if pid not in prod_worker_map: prod_worker_map[pid] = []
        prod_worker_map[pid].append(nama)

        # Logic Paid Status (Cek jika status_bayar == True)
        if g.get('status_bayar', False):
            if pid not in prod_paid_map: prod_paid_map[pid] = []
            prod_paid_map[pid].append(kid) # Simpan ID Karyawan

    # 3. Gabungkan Data Akhir
    final_result = []
    for p in produksi_list:
        workers = prod_worker_map.get(p['id'], [])
        paid_ids = prod_paid_map.get(p['id'], []) # Ambil list ID yang sudah dibayar
        
        p['jumlah_pekerja'] = len(workers)
        p['nama_pekerja'] = workers
        p['paid_karyawan_ids'] = paid_ids # Inject ke response
        
        final_result.append(p)

    return final_result

@api_router.put("/produksi/{id_produksi}", response_model=ProduksiHarianResponse)
async def update_produksi(id_produksi: str, data: ProduksiHarianCreate, _: dict = Depends(verify_token)):
    # 1. Cek keberadaan data produksi
    existing_doc = await db.produksi_harian.find_one({"id": id_produksi})
    if not existing_doc:
        raise HTTPException(status_code=404, detail="Data produksi tidak ditemukan")

    # 2. Update Data Fisik Produksi (Tanpa field pekerja)
    total_produksi = data.tempe_3k_produksi + data.tempe_5k_produksi + data.tempe_10k_produksi
    
    update_data = {
        "tanggal": data.tanggal.isoformat(),
        "kedelai_kg": data.kedelai_kg,
        "tempe_3k_produksi": data.tempe_3k_produksi,
        "tempe_5k_produksi": data.tempe_5k_produksi,
        "tempe_10k_produksi": data.tempe_10k_produksi,
        "total_produksi": total_produksi,
        # Field 'pekerja' dan 'jumlah_pekerja' TIDAK diupdate disini secara langsung
    }

    await db.produksi_harian.update_one(
        {"id": id_produksi},
        {"$set": update_data}
    )

    # --- 3. LOGIKA SINKRONISASI PEKERJA (TABEL GAJI) ---
    
    # A. Ambil daftar gaji/pekerja yang sudah ada di DB untuk produksi ini
    existing_gaji_list = await db.gaji.find({"id_produksi": id_produksi}).to_list(1000)
    
    # Map: ID_Karyawan -> Data Gaji Lengkap
    existing_map = {g['id_karyawan']: g for g in existing_gaji_list}
    existing_ids = set(existing_map.keys())
    
    # B. Ambil daftar ID pekerja baru dari Form Frontend
    new_ids = set(data.pekerja)

    # C. Tentukan mana yang harus DITAMBAH (Insert)
    ids_to_add = new_ids - existing_ids
    
    # D. Tentukan mana yang harus DIHAPUS (Delete)
    ids_to_remove = existing_ids - new_ids

    import uuid

    # E. Eksekusi HAPUS (Hanya jika BELUM DIBAYAR)
    for kid in ids_to_remove:
        gaji_record = existing_map[kid]
        if gaji_record.get('status_bayar') == True:
            # Jika sudah dibayar, SKIP (Jangan dihapus walau user uncheck)
            continue 
        else:
            # Jika belum dibayar, boleh dihapus
            await db.gaji.delete_one({"id": gaji_record['id']})

    # F. Eksekusi TAMBAH
    if ids_to_add:
        docs_to_insert = []
        for kid in ids_to_add:
            docs_to_insert.append({
                "id": str(uuid.uuid4()),
                "id_produksi": id_produksi,
                "id_karyawan": kid,
                "nominal": 0,
                "status_bayar": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        if docs_to_insert:
            await db.gaji.insert_many(docs_to_insert)

    # --- 4. PERSIAPAN DATA RESPONSE ---
    
    # Ambil ulang data gaji terbaru setelah update untuk menghitung jumlah & nama
    final_gaji_list = await db.gaji.find({"id_produksi": id_produksi}).to_list(1000)
    
    # Ambil nama karyawan
    final_karyawan_ids = [g['id_karyawan'] for g in final_gaji_list]
    karyawan_data = await db.karyawan.find({"id": {"$in": final_karyawan_ids}}).to_list(1000)
    nama_map = {k['id']: k['nama'] for k in karyawan_data}
    
    nama_pekerja_list = [nama_map.get(kid, "Unknown") for kid in final_karyawan_ids]
    paid_ids = [g['id_karyawan'] for g in final_gaji_list if g.get('status_bayar')]

    # Gabungkan data untuk dikirim balik ke Frontend
    response_data = {
        **existing_doc,     # Data lama (ID, created_at)
        **update_data,      # Data baru (tempe, kedelai)
        "jumlah_pekerja": len(final_gaji_list),
        "nama_pekerja": nama_pekerja_list,
        "paid_karyawan_ids": paid_ids
    }

    return response_data

@api_router.patch("/produksi/{id_produksi}/update-exp")
async def update_status_exp(id_produksi: str, data: StatusExpUpdate, _: dict = Depends(verify_token)):
    # Update field stat_exp saja berdasarkan ID
    result = await db.produksi_harian.update_one(
        {"id": id_produksi},
        {"$set": {"stat_exp": data.stat_exp}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data produksi tidak ditemukan")

    return {"message": "Status expired berhasil diupdate", "id": id_produksi, "new_status": data.stat_exp}


@api_router.get("/stok/mon", response_model=StokSummary)
async def get_current_stok(_: dict = Depends(verify_token)):
    # --- LANGKAH 1: Cari Daftar Tanggal yang Expired ---
    # Kita perlu tahu tanggal mana saja yang stat_exp = True
    expired_docs = await db.produksi_harian.find(
        {"stat_exp": True}, 
        {"tanggal": 1, "_id": 0}
    ).to_list(10000)
    
    # Buat list tanggal yang harus diabaikan (Blacklist Dates)
    excluded_dates = [doc['tanggal'] for doc in expired_docs]

    # Buat Stage Matcher umum (Gunakan $nin / Not In)
    # Artinya: Ambil data yang tanggalnya TIDAK ADA di dalam list excluded_dates
    common_filter = {"$match": {"tanggal": {"$nin": excluded_dates}}}

    # --- LANGKAH 2: Hitung Total Produksi ---
    pipeline_prod = [
        common_filter, # Filter tanggal expired
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_produksi"},
            "total_5k": {"$sum": "$tempe_5k_produksi"},
            "total_10k": {"$sum": "$tempe_10k_produksi"}
        }}
    ]
    prod_res = await db.produksi_harian.aggregate(pipeline_prod).to_list(1)
    prod = prod_res[0] if prod_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- LANGKAH 3: Hitung Total Penjualan ---
    pipeline_jual = [
        common_filter, # Filter tanggal expired (Penjualan di hari basi tidak dihitung)
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_pcs"},
            "total_5k": {"$sum": "$tempe_5k_pcs"},
            "total_10k": {"$sum": "$tempe_10k_pcs"}
        }}
    ]
    jual_res = await db.penjualan.aggregate(pipeline_jual).to_list(1)
    jual = jual_res[0] if jual_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- LANGKAH 4: Hitung Total Return ---
    pipeline_ret = [
        common_filter, # Filter tanggal expired (Return di hari basi tidak dihitung)
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_return"},
            "total_5k": {"$sum": "$tempe_5k_return"},
            "total_10k": {"$sum": "$tempe_10k_return"}
        }}
    ]
    ret_res = await db.return_penjualan.aggregate(pipeline_ret).to_list(1)
    ret = ret_res[0] if ret_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- LANGKAH 5: Kalkulasi Akhir ---
    stok_3k = prod["total_3k"] - jual["total_3k"] + ret["total_3k"]
    stok_5k = prod["total_5k"] - jual["total_5k"] + ret["total_5k"]
    stok_10k = prod["total_10k"] - jual["total_10k"] + ret["total_10k"]

    return StokSummary(
        stok_3k=stok_3k,
        stok_5k=stok_5k,
        stok_10k=stok_10k,
        total_pcs=stok_3k + stok_5k + stok_10k,
        last_updated=datetime.now(timezone.utc).isoformat()
    )

@api_router.get("/stok/riwayat", response_model=List[RiwayatStokHarian])
async def get_riwayat_stok(_: dict = Depends(verify_token)):
    # 1. Ambil semua data dan kelompokkan by Tanggal (YYYY-MM-DD)
    # Kita menggunakan dictionary untuk menggabungkan data dari 3 koleksi
    daily_map = {}

    # Helper untuk inisialisasi tanggal di map
    def init_date(date_str):
        if date_str not in daily_map:
            daily_map[date_str] = {
                "prod_3k": 0, "prod_5k": 0, "prod_10k": 0,
                "jual_3k": 0, "jual_5k": 0, "jual_10k": 0,
                "ret_3k": 0,  "ret_5k": 0,  "ret_10k": 0
            }

    # --- A. Ambil Data Produksi ---
    async for doc in db.produksi_harian.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10] # Ambil YYYY-MM-DD
        init_date(date_key)
        daily_map[date_key]["prod_3k"] += doc["tempe_3k_produksi"]
        daily_map[date_key]["prod_5k"] += doc["tempe_5k_produksi"]
        daily_map[date_key]["prod_10k"] += doc["tempe_10k_produksi"]

    # --- B. Ambil Data Penjualan ---
    async for doc in db.penjualan.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10]
        init_date(date_key)
        daily_map[date_key]["jual_3k"] += doc["tempe_3k_pcs"]
        daily_map[date_key]["jual_5k"] += doc["tempe_5k_pcs"]
        daily_map[date_key]["jual_10k"] += doc["tempe_10k_pcs"]

    # --- C. Ambil Data Return ---
    async for doc in db.return_penjualan.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10]
        init_date(date_key)
        daily_map[date_key]["ret_3k"] += doc["tempe_3k_return"]
        daily_map[date_key]["ret_5k"] += doc["tempe_5k_return"]
        daily_map[date_key]["ret_10k"] += doc["tempe_10k_return"]

    # 2. Kalkulasi Running Balance (Saldo Berjalan)
    # Urutkan tanggal dari terlama ke terbaru
    sorted_dates = sorted(daily_map.keys())

    riwayat_list = []
    
    # Akumulator stok
    current_3k = 0
    current_5k = 0
    current_10k = 0

    for date in sorted_dates:
        d = daily_map[date]
        
        # Hitung Masuk (Prod + Return) dan Keluar (Jual) hari ini
        masuk_3k = d["prod_3k"] + d["ret_3k"]
        masuk_5k = d["prod_5k"] + d["ret_5k"]
        masuk_10k = d["prod_10k"] + d["ret_10k"]
        
        keluar_3k = d["jual_3k"]
        keluar_5k = d["jual_5k"]
        keluar_10k = d["jual_10k"]

        # Update Saldo Berjalan (Akumulasi sampai hari tersebut)
        current_3k += (masuk_3k - keluar_3k)
        current_5k += (masuk_5k - keluar_5k)
        current_10k += (masuk_10k - keluar_10k)

        # Hitung total items untuk display ringkas
        total_masuk = masuk_3k + masuk_5k + masuk_10k
        total_keluar = keluar_3k + keluar_5k + keluar_10k
        total_sisa = current_3k + current_5k + current_10k

        riwayat_list.append({
            "tanggal": date,
            "masuk_pcs": total_masuk,
            "keluar_pcs": total_keluar,
            "sisa_stok_3k": current_3k,
            "sisa_stok_5k": current_5k,
            "sisa_stok_10k": current_10k,
            "total_sisa_stok": total_sisa
        })

    # 3. Return data (dibalik agar tanggal terbaru di atas)
    return list(reversed(riwayat_list))

@api_router.get("/stok", response_model=List[ProduksiHarian])
async def get_stok(_: dict = Depends(verify_token)):
    # Get the most recent produksi data
    stok_list = await db.produksi_harian.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1)
    return [ProduksiHarian(**p) for p in stok_list]

@api_router.get("/stok/produk")
async def get_riwayat_stok(_: dict = Depends(verify_token)):
    # 1. Ambil semua data dan kelompokkan by Tanggal (YYYY-MM-DD)
    # Kita menggunakan dictionary untuk menggabungkan data dari 3 koleksi
    daily_map = {}

    # Helper untuk inisialisasi tanggal di map
    def init_date(date_str):
        if date_str not in daily_map:
            daily_map[date_str] = {
                "prod_3k": 0, "prod_5k": 0, "prod_10k": 0,
                "jual_3k": 0, "jual_5k": 0, "jual_10k": 0,
                "ret_3k": 0,  "ret_5k": 0,  "ret_10k": 0,
                "rsk_3k": 0,  "rsk_5k": 0,  "rsk_10k": 0,
                "stat_exp": False
            }

    # --- A. Ambil Data Produksi ---
    async for doc in db.produksi_harian.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10] # Ambil YYYY-MM-DD
        init_date(date_key)
        daily_map[date_key]["prod_3k"] += doc["tempe_3k_produksi"]
        daily_map[date_key]["prod_5k"] += doc["tempe_5k_produksi"]
        daily_map[date_key]["prod_10k"] += doc["tempe_10k_produksi"]
        is_exp = doc.get("stat_exp", False)
        if is_exp:
            daily_map[date_key]["stat_exp"] = True

    # --- B. Ambil Data Penjualan ---
    async for doc in db.penjualan.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10]
        init_date(date_key)
        daily_map[date_key]["jual_3k"] += doc["tempe_3k_pcs"]
        daily_map[date_key]["jual_5k"] += doc["tempe_5k_pcs"]
        daily_map[date_key]["jual_10k"] += doc["tempe_10k_pcs"]

    # --- C. Ambil Data Return ---
    async for doc in db.return_penjualan.find({}, {"_id": 0}):
        date_key = doc["tanggal"][:10]
        init_date(date_key)
        daily_map[date_key]["ret_3k"] += doc["tempe_3k_return"]
        daily_map[date_key]["ret_5k"] += doc["tempe_5k_return"]
        daily_map[date_key]["ret_10k"] += doc["tempe_10k_return"]
        # daily_map[date_key]["rsk_3k"] += doc["tempe_3k_rusak"]
        # daily_map[date_key]["rsk_5k"] += doc["tempe_5k_rusak"]
        # daily_map[date_key]["rsk_10k"] += doc["tempe_10k_rusak"]

    # 2. Kalkulasi Running Balance (Saldo Berjalan)
    # Urutkan tanggal dari terlama ke terbaru
    sorted_dates = sorted(daily_map.keys())

    riwayat_list = []
    
    for date in sorted_dates:
        d = daily_map[date]
        
        riwayat_list.append({
            "tanggal": date,
            "stat_exp": d["stat_exp"],
            "prod_stok_3k":  d["prod_3k"],
            "prod_stok_5k": d["prod_5k"],
            "prod_stok_10k": d["prod_10k"],
            "sell_stok_3k": d["jual_3k"],
            "sell_stok_5k": d["jual_5k"],
            "sell_stok_10k": d["jual_10k"],
            "res_stok_3k":  d["ret_3k"],
            "res_stok_5k": d["ret_5k"],
            "res_stok_10k": d["ret_10k"],
            "rsk_stok_3k":  d["rsk_3k"],
            "rsk_stok_5k": d["rsk_5k"],
            "rsk_stok_10k": d["rsk_10k"],
            "sisa_stok_3k":  d["prod_3k"] +  d["ret_3k"] - d["jual_3k"] - d["rsk_3k"],
            "sisa_stok_5k": d["prod_5k"] +  d["ret_5k"] - d["jual_5k"] - d["rsk_5k"],
            "sisa_stok_10k": d["prod_10k"] +  d["ret_10k"] - d["jual_10k"] - d["rsk_10k"]
        })

    # 3. Return data (dibalik agar tanggal terbaru di atas)
    return list(reversed(riwayat_list))

@api_router.post("/pengeluaran", response_model=Pengeluaran)
async def create_pengeluaran(data: PengeluaranCreate, _: dict = Depends(verify_token)):
    import uuid
    doc = {
        "id": str(uuid.uuid4()),
        "tanggal": data.tanggal.isoformat(),
        "kategori_pengeluaran": data.kategori_pengeluaran.value,
        "jumlah": data.jumlah,
        "keterangan": data.keterangan,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pengeluaran.insert_one(doc)
    return Pengeluaran(**doc)

@api_router.get("/pengeluaran", response_model=List[Pengeluaran])
async def get_pengeluaran(_: dict = Depends(verify_token)):
    pengeluaran_list = await db.pengeluaran.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    return [Pengeluaran(**p) for p in pengeluaran_list]


@api_router.get("/laporan/laba", response_model=List[LaporanLabaItem])
async def get_laporan_laba(period: str = "daily", limit: int = 30, _: dict = Depends(verify_token)):
    # --- 1. OPTIMASI: Hitung Batas Tanggal ---
    # Jangan ambil semua data dari awal sejarah, ambil secukupnya sesuai limit
    # Kita lebihkan sedikit (+5 hari) untuk safety margin
    today = date.today()
    start_date = (today - timedelta(days=limit + 5)).isoformat()
    
    query_filter = {"tanggal": {"$gte": start_date}}

    # --- 2. GET DATA (Dengan Filter Tanggal) ---
    penjualan_list = await db.penjualan.find(query_filter, {"_id": 0}).to_list(10000)
    return_list = await db.return_penjualan.find(query_filter, {"_id": 0}).to_list(10000)
    pengeluaran_list = await db.pengeluaran.find(query_filter, {"_id": 0}).to_list(10000)
    
    # --- 3. GROUPING ---
    from collections import defaultdict
    data_by_date = defaultdict(lambda: {"omzet": 0, "pengeluaran": 0})
    
    # Proses Penjualan (HANYA YANG LUNAS)
    for p in penjualan_list:
        # Default ke 'Lunas' jika data lama tidak punya field status
        status = p.get('status_pembayaran', 'Lunas')
        
        # LOGIKA INTI: Hanya hitung jika Lunas
        if status == 'Lunas':
            data_by_date[p['tanggal']]['omzet'] += p['total_penjualan']
        # Jika Tempo, uang belum masuk -> Jangan tambah ke Omzet
    
    # Proses Return (Mengurangi Omzet)
    for r in return_list:
        data_by_date[r['tanggal']]['omzet'] -= r['total_return']
    
    # Proses Pengeluaran
    for p in pengeluaran_list:
        data_by_date[p['tanggal']]['pengeluaran'] += p['jumlah']
    
    # --- 4. FORMATTING ---
    result = []
    # Ambil tanggal yang tersedia, urutkan terbaru dulu untuk dipotong sesuai limit
    sorted_dates_desc = sorted(data_by_date.keys(), reverse=True)[:limit]
    
    for tanggal in sorted_dates_desc:
        data = data_by_date[tanggal]
        laba = data['omzet'] - data['pengeluaran']
        
        result.append(LaporanLabaItem(
            tanggal=tanggal,
            omzet=data['omzet'],
            pengeluaran=data['pengeluaran'],
            laba=laba
        ))
    
    # Return urut dari tanggal tua ke muda (Ascending) untuk grafik Frontend
    return sorted(result, key=lambda x: x.tanggal)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
