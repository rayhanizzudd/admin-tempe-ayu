import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem('token');

export default function Pengeluaran() {
  const [showForm, setShowForm] = useState(false);
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori_pengeluaran: 'kedelai',
    jumlah: 0,
    keterangan: '',
  });

  useEffect(() => {
    fetchPengeluaran();
  }, []);

  const fetchPengeluaran = async () => {
    try {
      const response = await axios.get(`${API}/pengeluaran`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPengeluaranList(response.data);
    } catch (error) {
      console.error('Error fetching pengeluaran:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/pengeluaran`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success('Data pengeluaran berhasil ditambahkan!');
      setShowForm(false);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        kategori_pengeluaran: 'kedelai',
        jumlah: 0,
        keterangan: '',
      });
      fetchPengeluaran();
    } catch (error) {
      toast.error('Gagal menambahkan data pengeluaran!');
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

  const getCategoryColor = (category) => {
    const colors = {
      kedelai: 'bg-amber-100 text-amber-800',
      plastik: 'bg-blue-100 text-blue-800',
      ragi: 'bg-purple-100 text-purple-800',
      air: 'bg-cyan-100 text-cyan-800',
      listrik: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getTotalPengeluaran = () => {
    return pengeluaranList.reduce((sum, item) => sum + item.jumlah, 0);
  };

  return (
    <div data-testid="pengeluaran-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pengeluaran</h1>
          <p className="text-gray-600 mt-1">Kelola data pengeluaran usaha</p>
        </div>
        <Button
          data-testid="tambah-pengeluaran-button"
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? 'Tutup Form' : 'Tambah Pengeluaran'}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
              <p data-testid="total-pengeluaran-value" className="text-3xl font-bold text-gray-800">
                {formatRupiah(getTotalPengeluaran())}
              </p>
            </div>
            <div className="bg-amber-500 w-16 h-16 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>Form Input Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    data-testid="tanggal-pengeluaran-input"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="kategori_pengeluaran">Kategori Pengeluaran</Label>
                  <Select
                    value={formData.kategori_pengeluaran}
                    onValueChange={(value) => setFormData({ ...formData, kategori_pengeluaran: value })}
                  >
                    <SelectTrigger data-testid="kategori-pengeluaran-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kedelai">Kedelai</SelectItem>
                      <SelectItem value="plastik">Plastik</SelectItem>
                      <SelectItem value="ragi">Ragi</SelectItem>
                      <SelectItem value="air">Air</SelectItem>
                      <SelectItem value="listrik">Listrik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="jumlah">Jumlah (Rupiah)</Label>
                <Input
                  id="jumlah"
                  data-testid="jumlah-pengeluaran-input"
                  type="number"
                  min="0"
                  placeholder="Masukkan jumlah pengeluaran"
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  data-testid="keterangan-pengeluaran-input"
                  placeholder="Catatan tambahan (opsional)"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Nominal Pengeluaran:</span>
                  <span data-testid="jumlah-preview" className="text-2xl font-bold text-amber-600">
                    {formatRupiah(formData.jumlah)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="submit-pengeluaran-button"
                  type="submit"
                  disabled={loading}
                  className="bg-lime-500 hover:bg-lime-600 text-white"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Daftar Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengeluaranList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      Belum ada data pengeluaran
                    </TableCell>
                  </TableRow>
                ) : (
                  pengeluaranList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.kategori_pengeluaran)}`}>
                          {item.kategori_pengeluaran.charAt(0).toUpperCase() + item.kategori_pengeluaran.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatRupiah(item.jumlah)}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.keterangan || '-'}</TableCell>
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
