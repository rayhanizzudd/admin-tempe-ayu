import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Package,
  Box,
  Layers,
  CalendarRange,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function StokPage() {
  // State untuk Card (Akumulasi Stok Saat Ini)
  const [stokTotal, setStokTotal] = useState({
    stok_3k: 0,
    stok_5k: 0,
    stok_10k: 0,
    total_pcs: 0,
    last_updated: null,
  });

  // State untuk Tabel (Riwayat Per Hari)
  const [riwayatList, setRiwayatList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Panggil endpoint stok (summary) dan stok/riwayat (tabel)
      const [resStok, resRiwayat] = await Promise.all([
        axios.get(`${API}/stok`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        axios.get(`${API}/stok/riwayat`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      setStokTotal(resStok.data);
      setRiwayatList(resRiwayat.data);
      toast.success("Data stok diperbarui");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting
  const formatStok = (jumlah) => {
    if (jumlah <= 0)
      return (
        <span className="text-red-500 font-bold uppercase text-xs">Kosong</span>
      );
    return <span className="text-gray-800">{jumlah}</span>;
  };

  const formatDate = (dateString) => {
    // dateString dari backend format YYYY-MM-DD
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div data-testid="stok-page" className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Monitoring Stok</h1>
          <p className="text-gray-600 mt-1">
            Status Gudang & Riwayat Mutasi Harian
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* --- BAGIAN 1: CARD AKUMULASI (REALTIME) --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 3k */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tempe 3k
            </CardTitle>
            <Box className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_3k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Kecil</p>
          </CardContent>
        </Card>

        {/* Card 5k */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tempe 5k
            </CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_5k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Sedang</p>
          </CardContent>
        </Card>

        {/* Card 10k */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tempe 10k
            </CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_10k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Premium</p>
          </CardContent>
        </Card>

        {/* Card Total */}
        <Card className="bg-slate-900 text-white shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total
            </CardTitle>
            <Package className="h-4 w-4 text-slate-100" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stokTotal.total_pcs <= 0
                ? "KOSONG"
                : `${stokTotal.total_pcs} pcs`}
            </div>
            <p className="text-xs text-slate-400 mt-1">Semua varian</p>
          </CardContent>
        </Card>
      </div>

      <hr className="border-gray-200" />

      {/* --- BAGIAN 2: TABEL RIWAYAT STOK HARIAN (Closing Stock) --- */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <CalendarRange className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-bold text-gray-800">Buku Stok Harian</h2>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[180px]">Tanggal</TableHead>
                  <TableHead className="text-center text-blue-600">
                    Total Masuk
                    <br />
                    <span className="text-[10px] font-normal text-gray-500">
                      (Prod + Return)
                    </span>
                  </TableHead>
                  <TableHead className="text-center text-orange-600">
                    Total Keluar
                    <br />
                    <span className="text-[10px] font-normal text-gray-500">
                      (Penjualan)
                    </span>
                  </TableHead>
                  {/* Stok Akhir Per Varian */}
                  <TableHead className="text-right border-l">Sisa 3k</TableHead>
                  <TableHead className="text-right">Sisa 5k</TableHead>
                  <TableHead className="text-right">Sisa 10k</TableHead>
                  <TableHead className="text-right font-bold bg-slate-50">
                    Total Sisa
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riwayatList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      Belum ada riwayat transaksi.
                    </TableCell>
                  </TableRow>
                ) : (
                  riwayatList.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-gray-700">
                        {formatDate(item.tanggal)}
                      </TableCell>

                      {/* Kolom Masuk */}
                      <TableCell className="text-center">
                        {item.masuk_pcs > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <ArrowUp className="w-3 h-3 mr-1" />{" "}
                            {item.masuk_pcs}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>

                      {/* Kolom Keluar */}
                      <TableCell className="text-center">
                        {item.keluar_pcs > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <ArrowDown className="w-3 h-3 mr-1" />{" "}
                            {item.keluar_pcs}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>

                      {/* Kolom Sisa Stok Per Hari */}
                      <TableCell className="text-right border-l font-mono text-sm">
                        {formatStok(item.sisa_stok_3k)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatStok(item.sisa_stok_5k)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatStok(item.sisa_stok_10k)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 bg-slate-50">
                        {item.total_sisa_stok <= 0
                          ? "KOSONG"
                          : item.total_sisa_stok}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
