import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem('token');

export default function LaporanLaba() {
  const [laporanData, setLaporanData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLaporan();
  }, []);

  const fetchLaporan = async () => {
    try {
      const response = await axios.get(`${API}/laporan/laba?limit=30`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setLaporanData(response.data);
    } catch (error) {
      console.error('Error fetching laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate summary
  const getTotalOmzet = () => laporanData.reduce((sum, item) => sum + item.omzet, 0);
  const getTotalPengeluaran = () => laporanData.reduce((sum, item) => sum + item.pengeluaran, 0);
  const getTotalLaba = () => laporanData.reduce((sum, item) => sum + item.laba, 0);
  const getLabaDays = () => laporanData.filter(item => item.laba > 0).length;
  const getRugiDays = () => laporanData.filter(item => item.laba < 0).length;

  // Prepare chart data
  const barChartData = laporanData.slice(-14).map(item => ({
    tanggal: new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    Omzet: item.omzet,
    Pengeluaran: item.pengeluaran,
  }));

  const lineChartData = laporanData.map(item => ({
    tanggal: new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    Laba: item.laba,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="laporan-laba-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Laporan Laba</h1>
        <p className="text-gray-600 mt-1">Analisis keuangan dan performa usaha</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Omzet</p>
                <p data-testid="total-omzet" className="text-2xl font-bold text-blue-600">
                  {formatRupiah(getTotalOmzet())}
                </p>
              </div>
              <div className="bg-blue-500 w-12 h-12 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
                <p data-testid="total-pengeluaran-laporan" className="text-2xl font-bold text-amber-600">
                  {formatRupiah(getTotalPengeluaran())}
                </p>
              </div>
              <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Laba</p>
                <p data-testid="total-laba" className={`text-2xl font-bold ${getTotalLaba() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatRupiah(getTotalLaba())}
                </p>
              </div>
              <div className={`${getTotalLaba() >= 0 ? 'bg-green-500' : 'bg-red-500'} w-12 h-12 rounded-xl flex items-center justify-center`}>
                {getTotalLaba() >= 0 ? <TrendingUp className="h-6 w-6 text-white" /> : <TrendingDown className="h-6 w-6 text-white" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Performa</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Hari Laba</p>
                  <p data-testid="hari-laba" className="text-xl font-bold text-green-600">{getLabaDays()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Hari Rugi</p>
                  <p data-testid="hari-rugi" className="text-xl font-bold text-red-600">{getRugiDays()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Omzet vs Pengeluaran (14 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="Omzet" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Trend Laba Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
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
                  dot={{ r: 4, fill: '#84cc16' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Detail Laporan Laba per Hari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Omzet</TableHead>
                  <TableHead className="text-right">Pengeluaran</TableHead>
                  <TableHead className="text-right">Laba/Rugi</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporanData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      Belum ada data laporan
                    </TableCell>
                  </TableRow>
                ) : (
                  [...laporanData].reverse().map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { 
                          weekday: 'short',
                          day: '2-digit', 
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">
                        {formatRupiah(item.omzet)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-semibold">
                        {formatRupiah(item.pengeluaran)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${
                        item.laba >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatRupiah(item.laba)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.laba >= 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Laba
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Rugi
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
