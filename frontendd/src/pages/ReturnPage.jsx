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

export default function ReturnPage() {
  const [showForm, setShowForm] = useState(false);
  const [returnList, setReturnList] = useState([]);
  const [penjualanList, setPenjualanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    penjualan_id: '',
    tempe_3k_return: 0,
    tempe_5k_return: 0,
    tempe_10k_return: 0,
    keterangan: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [returnRes, penjualanRes] = await Promise.all([
        axios.get(`${API}/return`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        axios.get(`${API}/penjualan`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      setReturnList(returnRes.data);
      setPenjualanList(penjualanRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/return`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success('Data return berhasil ditambahkan!');
      setShowForm(false);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        penjualan_id: '',
        tempe_3k_return: 0,
        tempe_5k_return: 0,
        tempe_10k_return: 0,
        keterangan: '',
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan data return!');
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

  const calculateTotalReturn = () => {
    const total_3k = formData.tempe_3k_return * 3000;
    const total_5k = formData.tempe_5k_return * 5000;
    const total_10k = formData.tempe_10k_return * 10000;
    return total_3k + total_5k + total_10k;
  };

  const getPenjualanInfo = (penjualanId) => {
    return penjualanList.find(p => p.id === penjualanId);
  };

  return (
    <div data-testid="return-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Return Penjualan</h1>
          <p className="text-gray-600 mt-1">Kelola data return tempe</p>
        </div>
        <Button
          data-testid="tambah-return-button"
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? 'Tutup Form' : 'Tambah Return'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>Form Input Return</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    data-testid="tanggal-return-input"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="penjualan_id">Pilih Penjualan</Label>
                  <Select
                    value={formData.penjualan_id}
                    onValueChange={(value) => setFormData({ ...formData, penjualan_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="penjualan-select">
                      <SelectValue placeholder="Pilih penjualan" />
                    </SelectTrigger>
                    <SelectContent>
                      {penjualanList.map((penjualan) => (
                        <SelectItem key={penjualan.id} value={penjualan.id}>
                          {new Date(penjualan.tanggal).toLocaleDateString('id-ID')} - {penjualan.pembeli} ({formatRupiah(penjualan.total_penjualan)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Jumlah Return (pcs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tempe_3k_return">Tempe Rp 3.000</Label>
                    <Input
                      id="tempe_3k_return"
                      data-testid="tempe-3k-return-input"
                      type="number"
                      min="0"
                      value={formData.tempe_3k_return}
                      onChange={(e) => setFormData({ ...formData, tempe_3k_return: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tempe_5k_return">Tempe Rp 5.000</Label>
                    <Input
                      id="tempe_5k_return"
                      data-testid="tempe-5k-return-input"
                      type="number"
                      min="0"
                      value={formData.tempe_5k_return}
                      onChange={(e) => setFormData({ ...formData, tempe_5k_return: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tempe_10k_return">Tempe Rp 10.000</Label>
                    <Input
                      id="tempe_10k_return"
                      data-testid="tempe-10k-return-input"
                      type="number"
                      min="0"
                      value={formData.tempe_10k_return}
                      onChange={(e) => setFormData({ ...formData, tempe_10k_return: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  data-testid="keterangan-input"
                  placeholder="Alasan return (rusak, tidak laku, dll)"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total Return:</span>
                  <span data-testid="total-return-preview" className="text-2xl font-bold text-red-600">
                    {formatRupiah(calculateTotalReturn())}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="submit-return-button"
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
          <CardTitle>Daftar Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pembeli</TableHead>
                  <TableHead className="text-right">3k (pcs)</TableHead>
                  <TableHead className="text-right">5k (pcs)</TableHead>
                  <TableHead className="text-right">10k (pcs)</TableHead>
                  <TableHead className="text-right">Total Return</TableHead>
                  <TableHead className="text-right">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Belum ada data return
                    </TableCell>
                  </TableRow>
                ) : (
                  returnList.map((item) => {
                    const penjualanInfo = getPenjualanInfo(item.penjualan_id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {penjualanInfo?.pembeli || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.tempe_3k_return}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.tempe_5k_return}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.tempe_10k_return}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatRupiah(item.total_return)}
                        </TableCell>
                        <TableCell className="text-right max-w-xs truncate">
                          {item.keterangan || "-"}
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
