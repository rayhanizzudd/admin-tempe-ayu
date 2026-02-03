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
from datetime import datetime, timezone, date
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
    
    # Total produksi hari ini
    produksi = await db.produksi_harian.find_one({"tanggal": tanggal}, {"_id": 0})
    total_produksi = produksi['total_produksi'] if produksi else 0
    
    # Total penjualan hari ini
    penjualan_list = await db.penjualan.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    total_penjualan = sum(p['total_penjualan'] for p in penjualan_list)
    
    # Total return hari ini
    return_list = await db.return_penjualan.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    total_return = sum(r['total_return'] for r in return_list)
    
    # Total pengeluaran hari ini
    pengeluaran_list = await db.pengeluaran.find({"tanggal": tanggal}, {"_id": 0}).to_list(1000)
    total_pengeluaran = sum(p['jumlah'] for p in pengeluaran_list)
    
    # Hitung omzet dan laba
    omzet = total_penjualan - total_return
    laba = omzet - total_pengeluaran
    
    return DashboardSummary(
        total_produksi_hari_ini=total_produksi,
        total_penjualan_hari_ini=omzet,
        total_pengeluaran_hari_ini=total_pengeluaran,
        laba_hari_ini=laba
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
    # Get all data
    penjualan_list = await db.penjualan.find({}, {"_id": 0}).to_list(10000)
    return_list = await db.return_penjualan.find({}, {"_id": 0}).to_list(10000)
    pengeluaran_list = await db.pengeluaran.find({}, {"_id": 0}).to_list(10000)
    
    # Group by date
    from collections import defaultdict
    data_by_date = defaultdict(lambda: {"omzet": 0, "pengeluaran": 0})
    
    for p in penjualan_list:
        data_by_date[p['tanggal']]['omzet'] += p['total_penjualan']
    
    for r in return_list:
        data_by_date[r['tanggal']]['omzet'] -= r['total_return']
    
    for p in pengeluaran_list:
        data_by_date[p['tanggal']]['pengeluaran'] += p['jumlah']
    
    # Convert to list and sort
    result = []
    for tanggal in sorted(data_by_date.keys(), reverse=True)[:limit]:
        data = data_by_date[tanggal]
        laba = data['omzet'] - data['pengeluaran']
        result.append(LaporanLabaItem(
            tanggal=tanggal,
            omzet=data['omzet'],
            pengeluaran=data['pengeluaran'],
            laba=laba
        ))
    
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
