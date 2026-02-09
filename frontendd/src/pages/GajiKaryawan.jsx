import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, CalendarDays, Clock, CheckCheck } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function GajiPage() {
  const [gajiList, setGajiList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGaji();
  }, []);

  const fetchGaji = async () => {
    try {
      const response = await axios.get(`${API}/gaji`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setGajiList(response.data);
    } catch (error) {
      console.error("Error fetching gaji:", error);
      toast.error("Gagal mengambil data gaji");
    }
  };

  // --- LOGIKA CARD AKUMULASI (Hanya data yang SUDAH VERIFIKASI tapi BELUM BAYAR) ---
  const employeeSummaries = useMemo(() => {
    const uniqueNames = [
      ...new Set(gajiList.map((item) => item.nama_karyawan)),
    ];

    return uniqueNames.map((name) => {
      // Syarat Masuk Card:
      // 1. Nama sesuai
      // 2. Nominal > 0 (Artinya sudah diklik "Selesai"/Verifikasi di tabel)
      // 3. Status Bayar masih False (Belum diklik "Bayar" di card)
      const verifiedUnpaidItems = gajiList.filter(
        (item) =>
          item.nama_karyawan === name && item.nominal > 0 && !item.status_bayar,
      );

      return {
        nama_karyawan: name,
        total_gaji: verifiedUnpaidItems.reduce(
          (sum, item) => sum + item.nominal,
          0,
        ),
        total_hari: verifiedUnpaidItems.length,
        ids: verifiedUnpaidItems.map((item) => item.id),
      };
    });
  }, [gajiList]);

  // --- HANDLER TOMBOL TABEL (VERIFIKASI / SELESAI) ---
  const handleVerifikasi = async (item) => {
    try {
      setLoading(true);
      // Panggil endpoint Verifikasi (masukkan ke akumulasi)
      await axios.patch(
        `${API}/gaji/${item.id}/verifikasi`,
        {},
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      toast.success("Masuk ke antrian pembayaran");
      fetchGaji(); // Refresh data
    } catch (error) {
      toast.error("Gagal verifikasi");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER TOMBOL CARD (BAYAR / LUNASI) ---
  const handleBatchPay = async (summary) => {
    // summary.total_gaji adalah hasil reduce yang Anda tanyakan
    if (summary.total_gaji === 0) return;

    try {
      setLoading(true);

      // KITA GUNAKAN ENDPOINT BARU DISINI
      // Kita kirim summary.total_gaji agar backend mencatatnya sebagai pengeluaran
      await axios.post(
        `${API}/gaji/bayar-batch`,
        {
          ids: summary.ids, // Array ID Gaji
          total_nominal: summary.total_gaji, // <-- INI NOMINAL YANG MASUK PENGELUARAN
          nama_karyawan: summary.nama_karyawan,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      toast.success(
        `Pembayaran untuk ${summary.nama_karyawan} berhasil dicatat!`,
      );

      // Refresh data
      fetchGaji();
      // Jika Anda punya state pengeluaran di halaman ini, refresh juga:
      // fetchPengeluaran();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses pembayaran");
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER FORMATTING ---
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getRowSpans = (data) => {
    const spans = {};
    let currentKey = null;
    let counter = 0;
    data.forEach((item, index) => {
      const dateKey = item.tanggal_produksi;
      if (dateKey !== currentKey) {
        if (currentKey !== null) spans[index - counter] = counter;
        currentKey = dateKey;
        counter = 1;
      } else {
        counter++;
      }
      if (index === data.length - 1) spans[index - counter + 1] = counter;
    });
    return spans;
  };

  const rowSpans = getRowSpans(gajiList);

  return (
    <div className="space-y-8 p-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Manajemen Gaji</h1>
        <p className="text-gray-600">
          Verifikasi harian & Pembayaran akumulatif
        </p>
      </div>

      {/* --- BAGIAN 1: CARD AKUMULASI (Hanya Muncul jika ada yang perlu dibayar) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {employeeSummaries.map((emp, index) => (
          <Card
            key={index}
            className={`border-l-4 shadow-sm transition-all ${
              emp.total_gaji > 0
                ? "border-orange-500 bg-white"
                : "border-gray-200 bg-gray-50 opacity-60"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex justify-between items-center">
                {emp.nama_karyawan}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  Siap Dibayar (Akumulasi)
                </p>
                <p
                  className={`text-2xl font-bold ${emp.total_gaji > 0 ? "text-orange-600" : "text-gray-400"}`}
                >
                  {formatRupiah(emp.total_gaji)}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <Clock className="h-4 w-4" />
                  <span>{emp.total_hari} Hari Terverifikasi</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleBatchPay(emp)}
                disabled={emp.total_gaji === 0 || loading}
                className={`w-full ${
                  emp.total_gaji > 0
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {emp.total_gaji > 0 ? "Bayar Sekarang" : "Tidak Ada Tagihan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* --- BAGIAN 2: TABEL RINCIAN HARIAN --- */}
      <Card className="border-0 shadow-md mt-8">
        <CardHeader>
          <CardTitle>Rincian Gaji Harian (Verifikasi)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="w-[50px] text-center text-black font-bold">
                    No
                  </TableHead>
                  <TableHead className="text-black font-bold border-r">
                    Tanggal
                  </TableHead>
                  <TableHead className="text-black font-bold">
                    Nama Karyawan
                  </TableHead>
                  <TableHead className="text-right text-black font-bold">
                    Nominal
                  </TableHead>
                  <TableHead className="text-center text-black font-bold">
                    Status / Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gajiList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      Data Kosong
                    </TableCell>
                  </TableRow>
                ) : (
                  gajiList.map((item, index) => {
                    const isFirstInGroup = rowSpans[index] !== undefined;

                    // Logic Tampilan Nominal:
                    // Jika nominal (DB) ada nilainya -> Pakai itu (sudah diverifikasi)
                    // Jika 0 -> Pakai nominal_standar (proyeksi dari master karyawan)
                    const displayNominal =
                      item.nominal > 0 ? item.nominal : item.nominal_standar;

                    // Cek Status:
                    // 1. Paid (status_bayar = True) -> Hijau, Teks "Lunas"
                    // 2. Verified (nominal > 0) -> Biru, Teks "Masuk Akumulasi"
                    // 3. Draft (nominal = 0) -> Tombol "Selesai"
                    const isPaid = item.status_bayar;
                    const isVerified = item.nominal > 0;

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        {isFirstInGroup && (
                          <>
                            <TableCell
                              className="text-center align-top border-r font-medium text-gray-500"
                              rowSpan={rowSpans[index]}
                            >
                              {index + 1}
                            </TableCell>
                            <TableCell
                              className="align-top border-r font-bold text-gray-700"
                              rowSpan={rowSpans[index]}
                            >
                              {formatDate(item.tanggal_produksi)}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="font-medium">
                          {item.nama_karyawan}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatRupiah(displayNominal)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                              <CheckCheck className="h-3 w-3" /> Lunas
                            </span>
                          ) : isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                              <Clock className="h-3 w-3" /> Menunggu Bayar
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleVerifikasi(item)}
                              disabled={loading}
                              className="h-7 text-xs px-3 bg-slate-800 hover:bg-slate-900 text-white"
                            >
                              Selesai
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
