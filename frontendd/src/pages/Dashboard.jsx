import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, ShoppingCart, Wallet, TrendingUp } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem('token');

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [laporanData, setLaporanData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, laporanRes] = await Promise.all([
        axios.get(`${API}/dashboard/summary`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        axios.get(`${API}/laporan/laba?limit=30`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      setSummary(summaryRes.data);
      setLaporanData(laporanRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Produksi Hari Ini",
      value: summary?.total_produksi_hari_ini || 0,
      suffix: "pcs",
      icon: Package,
      color: "bg-lime-500",
      testId: "total-produksi",
    },
    {
      title: "Total Penjualan Hari Ini",
      value: formatRupiah(summary?.total_penjualan_hari_ini || 0),
      icon: ShoppingCart,
      color: "bg-blue-500",
      testId: "total-penjualan",
    },
    {
      title: "Total Pengeluaran Hari Ini",
      value: formatRupiah(summary?.total_pengeluaran_hari_ini || 0),
      icon: Wallet,
      color: "bg-amber-500",
      testId: "total-pengeluaran",
    },
    {
      title: "Laba Hari Ini",
      value: formatRupiah(summary?.laba_hari_ini || 0),
      icon: TrendingUp,
      color: summary?.laba_hari_ini >= 0 ? "bg-green-500" : "bg-red-500",
      testId: "laba-hari-ini",
    },
  ];

  // 1. Cek loading dulu paling atas agar tidak memproses data kosong
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  // 2. Pastikan laporanData adalah Array sebelum diolah (PENGAMAN PENTING)
  // Jika laporanData null/undefined, kita pakai array kosong [] biar tidak error
  const safeData = Array.isArray(laporanData) ? laporanData : [];

  // 3. Prepare chart data (Sekarang aman karena pakai safeData)
  const barChartData = safeData.slice(0, 5).map((item, index) => ({
    tanggal: item.tanggal
      ? new Date(item.tanggal).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        })
      : "-",
    Omzet: item.omzet || 0, // Tambah || 0 agar grafik tidak error jika data null
    Pengeluaran: item.pengeluaran || 0,
    Laba: item.laba || 0,
  }));

  const lineChartData = safeData.map((item) => ({
    tanggal: item.tanggal
      ? new Date(item.tanggal).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        })
      : "-",
    Laba: item.laba || 0,
  }));

  return (
    // TAMBAHAN: tambahkan className="w-full" agar memaksa div ini selebar layar
    <div data-testid="dashboard-page" className="w-full space-y-6">
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan usaha tempe hari ini</p>
      </div>

      {/* Stat Cards */}
      {/* Grid ini akan otomatis mengisi lebar w-full karena layout parent sudah diperbaiki */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p
                      data-testid={stat.testId}
                      className="text-2xl font-bold text-gray-800"
                    >
                      {stat.value} {stat.suffix || ""}
                    </p>
                  </div>
                  <div
                    className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle>
              Omzet vs Pengeluaran vs Laba (10 Hari Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="Omzet" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar
                  dataKey="Pengeluaran"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                />
                <Bar dataKey="Laba" fill="#84cc16" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="border-0 shadow-md bg-white">
          <CardHeader>
            <CardTitle>Trend Laba Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Laba"
                  stroke="#84cc16"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
);
}
