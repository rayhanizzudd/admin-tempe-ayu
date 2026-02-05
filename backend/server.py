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
    kategori_pembeli: KategoriPembeli
    tempe_3k_pcs: int = 0
    tempe_5k_pcs: int = 0
    tempe_10k_pcs: int = 0
    status_pembayaran: StatusPembayaran

class Penjualan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
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
    jumlah_pekerja: int

class ProduksiHarian(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tanggal: str
    kedelai_kg: float
    tempe_3k_produksi: int
    tempe_5k_produksi: int
    tempe_10k_produksi: int
    total_produksi: int
    jumlah_pekerja: int
    created_at: str

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

# Routes
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
    
    import uuid
    doc = {
        "id": str(uuid.uuid4()),
        "tanggal": data.tanggal.isoformat(),
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

@api_router.post("/produksi", response_model=ProduksiHarian)
async def create_produksi(data: ProduksiHarianCreate, _: dict = Depends(verify_token)):
    total_produksi = data.tempe_3k_produksi + data.tempe_5k_produksi + data.tempe_10k_produksi
    
    import uuid
    doc = {
        "id": str(uuid.uuid4()),
        "tanggal": data.tanggal.isoformat(),
        "kedelai_kg": data.kedelai_kg,
        "tempe_3k_produksi": data.tempe_3k_produksi,
        "tempe_5k_produksi": data.tempe_5k_produksi,
        "tempe_10k_produksi": data.tempe_10k_produksi,
        "total_produksi": total_produksi,
        "jumlah_pekerja": data.jumlah_pekerja,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.produksi_harian.insert_one(doc)
    return ProduksiHarian(**doc)

@api_router.get("/produksi", response_model=List[ProduksiHarian])
async def get_produksi(_: dict = Depends(verify_token)):
    produksi_list = await db.produksi_harian.find({}, {"_id": 0}).sort("tanggal", -1).to_list(1000)
    return [ProduksiHarian(**p) for p in produksi_list]

@api_router.get("/stok", response_model=StokSummary)
async def get_current_stok(_: dict = Depends(verify_token)):
    # --- 1. Hitung Total Produksi ---
    pipeline_prod = [
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_produksi"},
            "total_5k": {"$sum": "$tempe_5k_produksi"},
            "total_10k": {"$sum": "$tempe_10k_produksi"}
        }}
    ]
    # Jalankan agregasi, gunakan to_list(1) karena hasilnya pasti cuma 1 dokumen summary
    prod_res = await db.produksi_harian.aggregate(pipeline_prod).to_list(1)
    prod = prod_res[0] if prod_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- 2. Hitung Total Penjualan ---
    pipeline_jual = [
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_pcs"},
            "total_5k": {"$sum": "$tempe_5k_pcs"},
            "total_10k": {"$sum": "$tempe_10k_pcs"}
        }}
    ]
    jual_res = await db.penjualan.aggregate(pipeline_jual).to_list(1)
    jual = jual_res[0] if jual_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- 3. Hitung Total Return (Barang masuk lagi ke stok) ---
    pipeline_ret = [
        {"$group": {
            "_id": None,
            "total_3k": {"$sum": "$tempe_3k_return"},
            "total_5k": {"$sum": "$tempe_5k_return"},
            "total_10k": {"$sum": "$tempe_10k_return"}
        }}
    ]
    ret_res = await db.return_penjualan.aggregate(pipeline_ret).to_list(1)
    ret = ret_res[0] if ret_res else {"total_3k": 0, "total_5k": 0, "total_10k": 0}

    # --- 4. Kalkulasi Akhir ---
    # Stok = Produksi - Penjualan + Return
    stok_3k = prod["total_3k"] - jual["total_3k"] + ret["total_3k"]
    stok_5k = prod["total_5k"] - jual["total_5k"] + ret["total_5k"]
    stok_10k = prod["total_10k"] - jual["total_10k"] + ret["total_10k"]

    # Pastikan stok tidak minus (opsional, untuk safety display)
    # stok_3k = max(0, stok_3k) 

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
