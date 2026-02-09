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
        axios.get(`${API}/stok/mon`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        axios.get(`${API}/stok/produk`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      setStokTotal(resStok.data);
      setRiwayatList(resRiwayat.data);
      console.log("Fetched stok data:", resStok.data);
      // toast.success("Data stok diperbarui");
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
        <span className="text-red-500 font-bold uppercase text-xl">Kosong</span>
      );
    return <span className="text-gray-800">{jumlah}</span>;
  };
  const formatStokTable = (jumlah) => {
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
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-md font-medium text-gray-600">
              Tempe 3k
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_3k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Kecil</p>
          </CardContent>
        </Card>

        {/* Card 5k */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-md font-medium text-gray-600">
              Tempe 5k
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_5k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Sedang</p>
          </CardContent>
        </Card>

        {/* Card 10k */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-md font-medium text-gray-600">
              Tempe 10k
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStok(stokTotal.stok_10k)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempe Premium</p>
          </CardContent>
        </Card>

        {/* Card Total */}
        <Card className="bg-white text-black shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total
            </CardTitle>
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

        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="border-collapse border border-gray-200">
              <TableHeader>
                {/* Baris Header Pertama (Group) */}
                <TableRow className="bg-gray-100">
                  <TableHead
                    rowSpan={2}
                    className="w-[50px] text-center border text-gray-900 font-bold"
                  >
                    NO
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="w-[120px] text-center border text-gray-900 font-bold"
                  >
                    Tanggal
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center border border-b-gray-300 text-blue-700 font-bold bg-blue-50"
                  >
                    Produksi
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center border border-b-gray-300 text-orange-700 font-bold bg-orange-50"
                  >
                    Penjualan
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center border border-b-gray-300 text-red-700 font-bold bg-red-50"
                  >
                    Return
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center border border-b-gray-300 text-yellow-700 font-bold bg-yellow-50"
                  >
                    Rusak
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center border border-b-gray-300 text-green-700 font-bold bg-green-50"
                  >
                    Sisa
                  </TableHead>
                </TableRow>

                {/* Baris Header Kedua (Varian) */}
                <TableRow className="bg-gray-50">
                  {/* Produksi */}
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    3k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    5k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    10k
                  </TableHead>
                  {/* Penjualan */}
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    3k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    5k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    10k
                  </TableHead>
                  {/* Return */}
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    3k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    5k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    10k
                  </TableHead>
                  {/* Rusak */}
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    3k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    5k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    10k
                  </TableHead>
                  {/* Sisa */}
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    3k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    5k
                  </TableHead>
                  <TableHead className="text-center border text-xs font-semibold text-gray-600">
                    10k
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {riwayatList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className="text-center py-8 text-gray-500"
                    >
                      Belum ada riwayat transaksi.
                    </TableCell>
                  </TableRow>
                ) : (
                  riwayatList.map((item, index) => (
                    <TableRow
                      key={index}
                      className={`hover:bg-slate-50 text-xs sm:text-sm ${item.stat_exp === true ? "bg-red-100 hover:bg-red-300" : ""}`}
                    >
                      {/* NO */}
                      <TableCell className="text-center border py-2">
                        {index + 1}
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="text-center border font-medium whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </TableCell>

                      {/* --- Kolom Produksi --- */}
                      <TableCell className="text-center border bg-blue-50/30">
                        {item.prod_stok_3k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-blue-50/30">
                        {item.prod_stok_5k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-blue-50/30">
                        {item.prod_stok_10k || "-"}
                      </TableCell>

                      {/* --- Kolom Penjualan --- */}
                      <TableCell className="text-center border bg-orange-50/30">
                        {item.sell_stok_3k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-orange-50/30">
                        {item.sell_stok_5k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-orange-50/30">
                        {item.sell_stok_10k || "-"}
                      </TableCell>

                      {/* --- Kolom Return --- */}
                      <TableCell className="text-center border bg-red-50/30">
                        {item.res_stok_3k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-red-50/30">
                        {item.res_stok_5k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-red-50/30">
                        {item.res_stok_10k || "-"}
                      </TableCell>

                      {/* --- Kolom Rusak --- */}
                      <TableCell className="text-center border bg-red-50/30">
                        {item.rsk_stok_3k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-red-50/30">
                        {item.rsk_stok_5k || "-"}
                      </TableCell>
                      <TableCell className="text-center border bg-red-50/30">
                        {item.rsk_stok_10k || "-"}
                      </TableCell>

                      {/* --- Kolom Sisa --- */}
                      <TableCell className="text-center border font-semibold bg-green-50/30">
                        {item.sisa_stok_3k}
                      </TableCell>
                      <TableCell className="text-center border font-semibold bg-green-50/30">
                        {item.sisa_stok_5k}
                      </TableCell>
                      <TableCell className="text-center border font-semibold bg-green-50/30">
                        {item.sisa_stok_10k}
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
