import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {Plus, Check, X } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function Penjualan() {
  const [showForm, setShowForm] = useState(false);
  const [penjualanList, setPenjualanList] = useState([]);
  const [loading, setLoading] = useState(false);

  // State form
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    pembeli: "",
    kategori_pembeli: "Eceran", // Default Eceran
    tempe_3k_pcs: 0,
    tempe_5k_pcs: 0,
    tempe_10k_pcs: 0,
    status_pembayaran: "Lunas",
  });

  // State untuk harga aktif (untuk preview UI)
  const [prices, setPrices] = useState({ p3k: 3000, p5k: 5000, p10k: 10000 });

  useEffect(() => {
    fetchPenjualan();
  }, []);

  // Effect untuk mengubah harga satuan saat Kategori berubah
  useEffect(() => {
    if (formData.kategori_pembeli === "Grosir") {
      setPrices({ p3k: 2500, p5k: 4000, p10k: 10000 });
    } else {
      setPrices({ p3k: 3000, p5k: 5000, p10k: 10000 });
    }
  }, [formData.kategori_pembeli]);

  const fetchPenjualan = async () => {
    try {
      const response = await axios.get(`${API}/penjualan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPenjualanList(response.data);
    } catch (error) {
      console.error("Error fetching penjualan:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized redirect if needed
      }
    }
  };

  // Fungsi untuk mengubah status Tempo <-> Lunas
  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(
        `${API}/penjualan/${id}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      toast.success("Status pembayaran berhasil diperbarui!");
      fetchPenjualan(); // Refresh data tabel agar status berubah di UI
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Gagal mengubah status pembayaran!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/penjualan`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success("Data penjualan berhasil ditambahkan!");
      setShowForm(false);
      // Reset form
      setFormData({
        tanggal: new Date().toISOString().split("T")[0],
        pembeli: "",
        kategori_pembeli: "Eceran",
        tempe_3k_pcs: 0,
        tempe_5k_pcs: 0,
        tempe_10k_pcs: 0,
        status_pembayaran: "Lunas",
      });
      fetchPenjualan();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menambahkan data penjualan!");
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Kalkulasi subtotal untuk preview di Frontend
  const calculateSubtotal = () => {
    const subtotal_3k = formData.tempe_3k_pcs * prices.p3k;
    const subtotal_5k = formData.tempe_5k_pcs * prices.p5k;
    const subtotal_10k = formData.tempe_10k_pcs * prices.p10k;
    return subtotal_3k + subtotal_5k + subtotal_10k;
  };

  return (
    <div data-testid="penjualan-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Data Penjualan</h1>
          <p className="text-gray-600 mt-1">Kelola data penjualan tempe</p>
        </div>
        <Button
          data-testid="tambah-penjualan-button"
          onClick={() => setShowForm(!showForm)}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? "Tutup Form" : "Tambah Penjualan"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>Form Input Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    data-testid="tanggal-input"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pembeli">Nama Pembeli</Label>
                  <Input
                    id="pembeli"
                    data-testid="pembeli-input"
                    type="text"
                    placeholder="Masukkan nama pembeli"
                    value={formData.pembeli}
                    onChange={(e) =>
                      setFormData({ ...formData, pembeli: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="kategori_pembeli">Kategori Pembeli</Label>
                  <Select
                    value={formData.kategori_pembeli}
                    onValueChange={(value) =>
                      setFormData({ ...formData, kategori_pembeli: value })
                    }
                  >
                    <SelectTrigger data-testid="kategori-pembeli-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eceran">
                        Eceran (Harga Normal)
                      </SelectItem>
                      <SelectItem value="Grosir">
                        Grosir (Harga Khusus)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status_pembayaran">Status Pembayaran</Label>
                  <Select
                    value={formData.status_pembayaran}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status_pembayaran: value })
                    }
                  >
                    <SelectTrigger data-testid="status-pembayaran-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunas">Lunas</SelectItem>
                      <SelectItem value="Tempo">Tempo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  Jumlah Tempe (pcs)
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Mode Harga: {formData.kategori_pembeli}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    {/* Label Dinamis sesuai harga aktif */}
                    <Label
                      htmlFor="tempe_3k_pcs"
                      className="flex justify-between"
                    >
                      <span>Tempe Kecil</span>
                      <span className="text-gray-500 font-normal text-xs">
                        {formatRupiah(prices.p3k)}/pcs
                      </span>
                    </Label>
                    <Input
                      id="tempe_3k_pcs"
                      data-testid="tempe-3k-input"
                      type="number"
                      min="0"
                      value={formData.tempe_3k_pcs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_3k_pcs: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="tempe_5k_pcs"
                      className="flex justify-between"
                    >
                      <span>Tempe Sedang</span>
                      <span className="text-gray-500 font-normal text-xs">
                        {formatRupiah(prices.p5k)}/pcs
                      </span>
                    </Label>
                    <Input
                      id="tempe_5k_pcs"
                      data-testid="tempe-5k-input"
                      type="number"
                      min="0"
                      value={formData.tempe_5k_pcs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_5k_pcs: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="tempe_10k_pcs"
                      className="flex justify-between"
                    >
                      <span>Tempe Besar</span>
                      <span className="text-gray-500 font-normal text-xs">
                        {formatRupiah(prices.p10k)}/pcs
                      </span>
                    </Label>
                    <Input
                      id="tempe_10k_pcs"
                      data-testid="tempe-10k-input"
                      type="number"
                      min="0"
                      value={formData.tempe_10k_pcs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_10k_pcs: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Total Estimasi:
                  </span>
                  <span
                    data-testid="total-preview"
                    className="text-2xl font-bold text-lime-600"
                  >
                    {formatRupiah(calculateSubtotal())}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="submit-penjualan-button"
                  type="submit"
                  disabled={loading}
                  className="bg-lime-500 hover:bg-lime-600 text-white"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
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
          <CardTitle>Daftar Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Pembeli</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead className="text-center">3k/2.5k(pcs)</TableHead>
                  <TableHead className="text-center">5k/4k(pcs)</TableHead>
                  <TableHead className="text-center">10k(pcs)</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penjualanList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-8"
                    >
                      Belum ada data penjualan
                    </TableCell>
                  </TableRow>
                ) : (
                  penjualanList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="font-medium text-center">
                        {item.pembeli}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${item.kategori_pembeli === "Grosir" ? "bg-purple-100 text-purple-800" : "bg-lime-100 text-lime-800"}`}
                        >
                          {item.kategori_pembeli}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.tempe_3k_pcs}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.tempe_5k_pcs}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.tempe_10k_pcs}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {formatRupiah(item.total_penjualan)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status_pembayaran === "Lunas"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status_pembayaran}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status_pembayaran === "Tempo" ? (
                          // Jika Tempo -> Tampilkan Tombol Centang (Hijau)
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleToggleStatus(item.id)}
                            title="Tandai Lunas"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : (
                          // Jika Lunas -> Tampilkan Tombol Silang (Merah)
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleToggleStatus(item.id)}
                            title="Kembalikan ke Tempo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
