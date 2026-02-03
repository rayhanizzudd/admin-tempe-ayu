import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem('token');

export default function Produksi() {
  const [showForm, setShowForm] = useState(false);
  const [produksiList, setProduksiList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kedelai_kg: 0,
    tempe_3k_produksi: 0,
    tempe_5k_produksi: 0,
    tempe_10k_produksi: 0,
    jumlah_pekerja: 0,
  });

  useEffect(() => {
    fetchProduksi();
  }, []);

  const fetchProduksi = async () => {
    try {
      const response = await axios.get(`${API}/produksi`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setProduksiList(response.data);
    } catch (error) {
      console.error('Error fetching produksi:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/produksi`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success('Data produksi berhasil ditambahkan!');
      setShowForm(false);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        kedelai_kg: 0,
        tempe_3k_produksi: 0,
        tempe_5k_produksi: 0,
        tempe_10k_produksi: 0,
        jumlah_pekerja: 0,
      });
      fetchProduksi();
    } catch (error) {
      toast.error('Gagal menambahkan data produksi!');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return formData.tempe_3k_produksi + formData.tempe_5k_produksi + formData.tempe_10k_produksi;
  };

  return (
    <div data-testid="produksi-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Produksi Harian</h1>
          <p className="text-gray-600 mt-1">Kelola data produksi tempe harian</p>
        </div>
        <Button
          data-testid="tambah-produksi-button"
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? 'Tutup Form' : 'Tambah Produksi'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>Form Input Produksi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    data-testid="tanggal-produksi-input"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="kedelai_kg">Kedelai (kg)</Label>
                  <Input
                    id="kedelai_kg"
                    data-testid="kedelai-input"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Masukkan jumlah kedelai"
                    value={formData.kedelai_kg}
                    onChange={(e) => setFormData({ ...formData, kedelai_kg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jumlah_pekerja">Jumlah Pekerja</Label>
                  <Input
                    id="jumlah_pekerja"
                    data-testid="jumlah-pekerja-input"
                    type="number"
                    min="0"
                    placeholder="Masukkan jumlah pekerja"
                    value={formData.jumlah_pekerja}
                    onChange={(e) => setFormData({ ...formData, jumlah_pekerja: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Hasil Produksi (pcs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tempe_3k_produksi">Tempe Rp 3.000</Label>
                    <Input
                      id="tempe_3k_produksi"
                      data-testid="tempe-3k-produksi-input"
                      type="number"
                      min="0"
                      value={formData.tempe_3k_produksi}
                      onChange={(e) => setFormData({ ...formData, tempe_3k_produksi: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tempe_5k_produksi">Tempe Rp 5.000</Label>
                    <Input
                      id="tempe_5k_produksi"
                      data-testid="tempe-5k-produksi-input"
                      type="number"
                      min="0"
                      value={formData.tempe_5k_produksi}
                      onChange={(e) => setFormData({ ...formData, tempe_5k_produksi: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tempe_10k_produksi">Tempe Rp 10.000</Label>
                    <Input
                      id="tempe_10k_produksi"
                      data-testid="tempe-10k-produksi-input"
                      type="number"
                      min="0"
                      value={formData.tempe_10k_produksi}
                      onChange={(e) => setFormData({ ...formData, tempe_10k_produksi: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total Produksi:</span>
                  <span data-testid="total-produksi-preview" className="text-2xl font-bold text-lime-600">
                    {calculateTotal()} pcs
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="submit-produksi-button"
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
          <CardTitle>Daftar Produksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Kedelai (kg)</TableHead>
                  <TableHead className="text-right">3k (pcs)</TableHead>
                  <TableHead className="text-right">5k (pcs)</TableHead>
                  <TableHead className="text-right">10k (pcs)</TableHead>
                  <TableHead className="text-right">Total (pcs)</TableHead>
                  <TableHead className="text-right">Pekerja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produksiList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Belum ada data produksi
                    </TableCell>
                  </TableRow>
                ) : (
                  produksiList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right font-medium">{item.kedelai_kg} kg</TableCell>
                      <TableCell className="text-right">{item.tempe_3k_produksi}</TableCell>
                      <TableCell className="text-right">{item.tempe_5k_produksi}</TableCell>
                      <TableCell className="text-right">{item.tempe_10k_produksi}</TableCell>
                      <TableCell className="text-right font-semibold text-lime-600">{item.total_produksi}</TableCell>
                      <TableCell className="text-right">{item.jumlah_pekerja}</TableCell>
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
