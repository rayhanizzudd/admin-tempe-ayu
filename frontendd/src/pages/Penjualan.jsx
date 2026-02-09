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
import { Plus } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function Penjualan() {
  const [showForm, setShowForm] = useState(false);
  const [penjualanList, setPenjualanList] = useState([]);
  const [riwayatList, setRiwayatList] = useState([]);
  
  const [loading, setLoading] = useState(false);

  // State untuk Opsi Tanggal Produksi (Dropdown)
  const [produksiOptions, setProduksiOptions] = useState([]);
  // [KURANG 1] State untuk menyimpan sisa stok dari tanggal yang dipilih
  const [selectedStock, setSelectedStock] = useState(null);

  // State form
  const [formData, setFormData] = useState({
    tanggal: "", // Tanggal Produksi (dari Dropdown)
    tanggal_penjualan: new Date().toISOString().split("T")[0], // Tanggal Penjualan (Hari ini)
    pembeli: "",
    kategori_pembeli: "Eceran",
    tempe_3k_pcs: 0,
    tempe_5k_pcs: 0,
    tempe_10k_pcs: 0,
    status_pembayaran: "Lunas",
  });

  // State untuk harga aktif (untuk preview UI)
  const [prices, setPrices] = useState({ p3k: 3000, p5k: 5000, p10k: 10000 });

  useEffect(() => {
    fetchPenjualan();
    fetchProduksiOptions();
    fetchRiwayatStok(); // Ambil data riwayat stok saat load
  }, []);

  // Effect untuk mengubah harga satuan saat Kategori berubah
  useEffect(() => {
    if (formData.kategori_pembeli === "Grosir") {
      setPrices({ p3k: 2500, p5k: 4000, p10k: 10000 });
    } else {
      setPrices({ p3k: 3000, p5k: 5000, p10k: 10000 });
    }
  }, [formData.kategori_pembeli]);

  const handleProduksiChange = (val) => {
    // 1. Simpan value tanggal ke form
    setFormData({ ...formData, tanggal: val });

    // 2. Cari data detail stok dari opsi yang ada
    const stockItem = riwayatList.find((item) => item.tanggal === val);

    if (stockItem) {
      // 3. Simpan sisa stok ke state selectedStock
      setSelectedStock({
        sisa_3k: stockItem.sisa_stok_3k, // Field dari endpoint /stok/riwayat
        sisa_5k: stockItem.sisa_stok_5k,
        sisa_10k: stockItem.sisa_stok_10k,
      });

      // (Opsional) Reset input jumlah agar aman
      setFormData((prev) => ({
        ...prev,
        tanggal: val,
        tempe_3k_pcs: 0,
        tempe_5k_pcs: 0,
        tempe_10k_pcs: 0,
      }));
    }
  };

  const fetchPenjualan = async () => {
    try {
      const response = await axios.get(`${API}/penjualan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setPenjualanList(response.data);
    } catch (error) {
      console.error("Error fetching penjualan:", error);
    }
  };

  // --- FETCH DATA PRODUKSI UNTUK DROPDOWN ---
  const fetchProduksiOptions = async () => {
    try {
      const response = await axios.get(`${API}/produksi`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      // Filter: Hanya ambil yang BELUM EXPIRED
      const activeProduksi = response.data
        .filter((item) => !item.stat_exp)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)); // Urutkan terbaru
      setProduksiOptions(activeProduksi);
    } catch (error) {
      console.error("Gagal ambil data produksi:", error);
    }
  };

  const fetchRiwayatStok = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stok/produk`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      console.log("Riwayat Stok:", response.data);
      setRiwayatList(response.data);
    } catch (error) {
      console.error("Gagal mengambil riwayat stok:", error);
      toast.error("Gagal memuat data stok.");
    } finally {
      setLoading(false);
    }
  };

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
      fetchPenjualan();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Gagal mengubah status pembayaran!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validasi: Pastikan tanggal produksi dipilih
      if (!formData.tanggal) {
        toast.error("Harap pilih Tanggal Produksi!");
        setLoading(false);
        return;
      }
      console.log("Submitting form data:", formData);

      await axios.post(`${API}/penjualan`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success("Data penjualan berhasil ditambahkan!");
      setShowForm(false);

      // Reset form
      setFormData({
        tanggal_produksi: "",
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
      let msg = "Gagal menambahkan data penjualan!";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
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

  const calculateSubtotal = () => {
    return (
      formData.tempe_3k_pcs * prices.p3k +
      formData.tempe_5k_pcs * prices.p5k +
      formData.tempe_10k_pcs * prices.p10k
    );
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
                {/* --- UPDATE: DROPDOWN TANGGAL PRODUKSI --- */}
                <div>
                  <Label htmlFor="tanggal_produksi">
                    Tanggal Produksi (Sumber Stok)
                  </Label>
                  <Select
                    value={formData.tanggal}
                    // onValueChange={(val) =>
                    //   setFormData({ ...formData, tanggal: val })
                    // }
                    onValueChange={handleProduksiChange}
                    required
                  >
                    <SelectTrigger id="tanggal_produksi" className="w-full">
                      <SelectValue placeholder="Pilih Tanggal Produksi" />
                    </SelectTrigger>
                    <SelectContent>
                      {produksiOptions.length === 0 ? (
                        <SelectItem value="kosong" disabled>
                          Tidak ada stok tersedia (Semua expired/kosong)
                        </SelectItem>
                      ) : (
                        produksiOptions.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.tanggal.split("T")[0]}
                          >
                            {new Date(item.tanggal).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* --- INPUT TANGGAL TRANSAKSI PENJUALAN --- */}
                <div>
                  <Label htmlFor="tanggal">Tanggal Penjualan</Label>
                  <Input
                    id="tanggal_penjualan"
                    type="date"
                    value={formData.tanggal_penjualan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_penjualan: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pembeli">Nama Pembeli</Label>
                  <Input
                    id="pembeli"
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
                    <SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunas">Lunas</SelectItem>
                      <SelectItem value="Tempo">Tempo (Hutang)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Detail Pesanan</h3>

                {/* Tampilkan Info Sisa Stok jika sudah pilih tanggal */}
                {selectedStock && (
                  <div className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded">
                    Sisa Stok Tersedia:
                    <span className="ml-2 font-bold">
                      3k: {selectedStock.sisa_3k}
                    </span>
                    <span className="ml-2 font-bold">
                      5k: {selectedStock.sisa_5k}
                    </span>
                    <span className="ml-2 font-bold">
                      10k: {selectedStock.sisa_10k}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Input 3K */}
                  <div>
                    <Label>Tempe 3k</Label>
                    <Input
                      type="number"
                      min="0"
                      // LIMIT MAX SESUAI SISA STOK
                      max={selectedStock ? selectedStock.sisa_3k : 0}
                      // DISABLE JIKA BELUM PILIH TANGGAL atau STOK HABIS
                      disabled={!selectedStock || selectedStock.sisa_3k === 0}
                      value={formData.tempe_3k_pcs}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        // Validasi Manual agar tidak melebihi stok
                        if (selectedStock && val > selectedStock.sisa_3k) {
                          val = selectedStock.sisa_3k;
                          toast.warning(
                            `Maksimal stok 3k tersedia: ${selectedStock.sisa_3k}`,
                          );
                        }
                        setFormData({ ...formData, tempe_3k_pcs: val });
                      }}
                    />
                  </div>

                  {/* Input 5K */}
                  <div>
                    <Label>Tempe 5k</Label>
                    <Input
                      type="number"
                      min="0"
                      max={selectedStock ? selectedStock.sisa_5k : 0}
                      disabled={!selectedStock || selectedStock.sisa_5k === 0}
                      value={formData.tempe_5k_pcs}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        if (selectedStock && val > selectedStock.sisa_5k) {
                          val = selectedStock.sisa_5k;
                          toast.warning(
                            `Maksimal stok 5k tersedia: ${selectedStock.sisa_5k}`,
                          );
                        }
                        setFormData({ ...formData, tempe_5k_pcs: val });
                      }}
                    />
                  </div>

                  {/* Input 10K */}
                  <div>
                    <Label>Tempe 10k</Label>
                    <Input
                      type="number"
                      min="0"
                      max={selectedStock ? selectedStock.sisa_10k : 0}
                      disabled={!selectedStock || selectedStock.sisa_10k === 0}
                      value={formData.tempe_10k_pcs}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        if (selectedStock && val > selectedStock.sisa_10k) {
                          val = selectedStock.sisa_10k;
                          toast.warning(
                            `Maksimal stok 10k tersedia: ${selectedStock.sisa_10k}`,
                          );
                        }
                        setFormData({ ...formData, tempe_10k_pcs: val });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-lime-50 border border-lime-200 rounded-lg p-4 flex justify-between items-center">
                <span className="font-semibold text-gray-700">
                  Total Harga:
                </span>
                <span className="text-2xl font-bold text-lime-600">
                  {formatRupiah(calculateSubtotal())}
                </span>
              </div>

              <div className="flex gap-3">
                <Button
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

      {/* Tabel Data Penjualan (Sama seperti sebelumnya, tidak diubah) */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Riwayat Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pembeli</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Total (Rp)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {penjualanList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      Belum ada data penjualan
                    </TableCell>
                  </TableRow>
                ) : (
                  penjualanList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {/* LOGIKA: Jika tanggal_pembelian ada, pakai itu. Jika tidak, pakai tanggal (produksi) */}
                        {new Date(
                          item.tanggal_pembelian || item.tanggal,
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.pembeli}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.kategori_pembeli === "Grosir"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.kategori_pembeli}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatRupiah(item.total_penjualan)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status_pembayaran === "Lunas"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.status_pembayaran}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(item.id)}
                          className="text-xs h-7"
                        >
                          Ubah Status
                        </Button>
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
