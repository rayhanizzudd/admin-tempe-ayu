import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, AlertTriangle, X, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function ProduksiPage() {
  const [showForm, setShowForm] = useState(false);
  const [produksiList, setProduksiList] = useState([]);
  const [karyawanList, setKaryawanList] = useState([]);
  const [lockedWorkers, setLockedWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  // State untuk mode Edit
  const [editId, setEditId] = useState(null);

  // State untuk Konfirmasi Expired
  const [showConfirmExp, setShowConfirmExp] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState(null);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kedelai_kg: 0,
    pekerja: [],
    tempe_3k_produksi: 0,
    tempe_5k_produksi: 0,
    tempe_10k_produksi: 0,
  });

  useEffect(() => {
    fetchProduksi();
    fetchKaryawan();
  }, []);

  const fetchKaryawan = async () => {
    try {
      const response = await axios.get(`${API}/karyawan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      // Hanya ambil karyawan yang status_aktif = true
      const aktif = response.data.filter((k) => k.status_aktif);
      setKaryawanList(aktif);
    } catch (error) {
      console.error("Error fetching karyawan:", error);
    }
  };
  const handleWorkerChange = (karyawanId, isChecked) => {
    setFormData((prev) => {
      const currentWorkers = prev.pekerja || [];
      if (isChecked) {
        // Jika dicentang, masukkan ID ke array
        return { ...prev, pekerja: [...currentWorkers, karyawanId] };
      } else {
        // Jika uncheck, buang ID dari array
        return {
          ...prev,
          pekerja: currentWorkers.filter((id) => id !== karyawanId),
        };
      }
    });
  };
  const fetchProduksi = async () => {
    try {
      const response = await axios.get(`${API}/produksi`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setProduksiList(response.data);
    } catch (error) {
      console.error("Error fetching produksi:", error);
    }
  };

  const calculateTotal = () => {
    return (
      (formData.tempe_3k_produksi || 0) +
      (formData.tempe_5k_produksi || 0) +
      (formData.tempe_10k_produksi || 0)
    );
  };

  // --- FUNGSI EDIT ---
  const handleEdit = (item) => {
    setEditId(item.id);

    const paidIds = item.paid_karyawan_ids || [];
    setLockedWorkers(paidIds); // Simpan ke state

    let selectedWorkerIds = [];
    // Cek apakah ada data nama_pekerja dari tabel
    if (item.nama_pekerja && Array.isArray(item.nama_pekerja)) {
      selectedWorkerIds = karyawanList
        .filter((k) => item.nama_pekerja.includes(k.nama)) // Cari karyawan yang namanya cocok
        .map((k) => k.id); // Ambil ID-nya
    }

    setFormData({
      tanggal: item.tanggal.split("T")[0],
      kedelai_kg: item.kedelai_kg,
      pekerja: selectedWorkerIds,
      tempe_3k_produksi: item.tempe_3k_produksi,
      tempe_5k_produksi: item.tempe_5k_produksi,
      tempe_10k_produksi: item.tempe_10k_produksi,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- 1. FUNGSI MEMBUKA POPUP KONFIRMASI ---
  const openConfirmExp = (item) => {
    // Jika sudah expired, jangan lakukan apa-apa (sesuai request "tidak ada aksi hapus")
    if (item.stat_exp) return;

    setItemToConfirm(item);
    setShowConfirmExp(true);
  };

  // --- 2. FUNGSI EKSEKUSI SET EXPIRED (DIPANGGIL DARI POPUP) ---
  const handleConfirmSetExpired = async () => {
    if (!itemToConfirm) return;

    try {
      // Kita memaksa status menjadi TRUE (bukan toggle)
      await axios.patch(
        `${API}/produksi/${itemToConfirm.id}/update-exp`,
        {
          stat_exp: true, // Selalu true
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      toast.success("Berhasil ditandai sebagai Expired/Basi");
      fetchProduksi(); // Refresh data
    } catch (error) {
      console.error("Gagal update status:", error);
      toast.error("Gagal mengubah status expired");
    } finally {
      // Tutup modal dan reset state
      setShowConfirmExp(false);
      setItemToConfirm(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editId) {
        await axios.put(`${API}/produksi/${editId}`, formData, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Data produksi berhasil diperbarui!");
      } else {
        await axios.post(`${API}/produksi`, formData, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Data produksi berhasil ditambahkan!");
      }

      setShowForm(false);
      setEditId(null);
      setFormData({
        tanggal: new Date().toISOString().split("T")[0],
        kedelai_kg: 0,
        pekerja: "",
        tempe_3k_produksi: 0,
        tempe_5k_produksi: 0,
        tempe_10k_produksi: 0,
      });
      fetchProduksi();
    } catch (error) {
      console.error("Error submit:", error); // Cek console browser untuk detail

      // --- PERBAIKAN DI SINI ---
      // Ambil pesan dari error.response.data.detail
      // Jika tidak ada, gunakan pesan default
      let errorMessage = "Gagal menyimpan data produksi!";

      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      }

      // Tampilkan Toast Merah dengan pesan yang jelas
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      kedelai_kg: 0,
      pekerja: [],
      tempe_3k_produksi: 0,
      tempe_5k_produksi: 0,
      tempe_10k_produksi: 0,
    });
  };

  return (
    <div data-testid="produksi-page" className="relative">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Produksi Harian</h1>
          <p className="text-gray-600 mt-1">
            Kelola data produksi tempe harian
          </p>
        </div>
        <Button
          data-testid="tambah-produksi-button"
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
          }}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? "Tutup Form" : "Tambah Produksi"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>
              {editId ? "Edit Data Produksi" : "Form Input Produksi"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="kedelai_kg">Kedelai (kg)</Label>
                  <Input
                    id="kedelai_kg"
                    type="number"
                    step="0.1"
                    value={formData.kedelai_kg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kedelai_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-span-1 md:col-span-2 border rounded-md p-4 bg-slate-50">
                  <Label className="mb-3 block font-semibold text-gray-700">
                    Pilih Pekerja Bertugas
                  </Label>

                  {karyawanList.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 bg-white rounded border border-dashed">
                      Tidak ada karyawan aktif. Silakan tambah di menu Karyawan.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {karyawanList.map((karyawan) => {
                        // Cek apakah karyawan ini sudah digaji?
                        const isLocked = lockedWorkers.includes(karyawan.id);
                        const isChecked = formData.pekerja.includes(
                          karyawan.id,
                        );

                        return (
                          <div
                            key={karyawan.id}
                            className={`flex items-center space-x-2 p-2 rounded border transition-colors ${
                              isChecked
                                ? isLocked
                                  ? "bg-gray-100 border-gray-300" // Style jika Terkunci (Sudah Gaji)
                                  : "bg-lime-50 border-lime-500" // Style Terpilih Biasa
                                : "bg-white border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <Checkbox
                              id={`worker-${karyawan.id}`}
                              checked={isChecked}
                              // DISABLE JIKA SUDAH DIGAJI (LOCKED)
                              disabled={isLocked}
                              onCheckedChange={(checked) =>
                                handleWorkerChange(karyawan.id, checked)
                              }
                            />
                            <Label
                              htmlFor={`worker-${karyawan.id}`}
                              className={`text-sm font-medium w-full cursor-pointer ${isLocked ? "text-gray-500 cursor-not-allowed" : ""}`}
                            >
                              {karyawan.nama}
                              {/* Indikator Visual (Opsional) */}
                              {isLocked && (
                                <span className="text-[10px] text-green-600 ml-1 font-bold">
                                  (Lunas)
                                </span>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Total Terpilih:{" "}
                    <span className="font-bold text-lime-600">
                      {formData.pekerja.length}
                    </span>{" "}
                    Orang
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Hasil Produksi (pcs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tempe_3k_produksi">Tempe Rp 3.000</Label>
                    <Input
                      id="tempe_3k_produksi"
                      type="number"
                      value={formData.tempe_3k_produksi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_3k_produksi: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tempe_5k_produksi">Tempe Rp 5.000</Label>
                    <Input
                      id="tempe_5k_produksi"
                      type="number"
                      value={formData.tempe_5k_produksi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_5k_produksi: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tempe_10k_produksi">Tempe Rp 10.000</Label>
                    <Input
                      id="tempe_10k_produksi"
                      type="number"
                      value={formData.tempe_10k_produksi}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tempe_10k_produksi: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-lime-50 border border-lime-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">
                    Total Produksi:
                  </span>
                  <span className="text-2xl font-bold text-lime-600">
                    {calculateTotal()} pcs
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-lime-500 hover:bg-lime-600 text-white"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produksiList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-gray-500 py-8"
                    >
                      Belum ada data produksi
                    </TableCell>
                  </TableRow>
                ) : (
                  produksiList.map((item) => (
                    <TableRow
                      key={item.id}
                      className={
                        item.stat_exp
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-slate-50"
                      }
                    >
                      <TableCell>
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                        {item.stat_exp && (
                          <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-200 px-1 rounded">
                            EXP
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.kedelai_kg} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tempe_3k_produksi}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tempe_5k_produksi}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tempe_10k_produksi}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-lime-600">
                        {item.total_produksi}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-gray-800">
                            {item.jumlah_pekerja} Orang
                          </span>
                          {/* Tampilkan Nama Kecil-kecil di bawah angka */}
                          <span className="text-[10px] text-gray-500 max-w-[150px] leading-tight">
                            {item.nama_pekerja && item.nama_pekerja.length > 0
                              ? item.nama_pekerja.join(", ")
                              : "-"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {/* Tombol Edit */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(item)}
                            title="Edit Data"
                            // Opsional: Disable edit jika sudah expired?
                            disabled={item.stat_exp}
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>

                          {/* Tombol Expired (Dengan Konfirmasi) */}
                          <Button
                            variant="outline"
                            size="sm"
                            // Jika sudah expired, tombol merah dan DISABLED (tidak bisa hapus status)
                            disabled={item.stat_exp}
                            className={`h-8 w-8 p-0 ${
                              item.stat_exp
                                ? "border-red-500 bg-red-100 opacity-70 cursor-not-allowed"
                                : "hover:text-red-600 hover:border-red-300"
                            }`}
                            onClick={() => openConfirmExp(item)}
                            title={
                              item.stat_exp
                                ? "Sudah Expired (Permanen)"
                                : "Tandai Expired"
                            }
                          >
                            <AlertTriangle
                              className={`h-4 w-4 ${
                                item.stat_exp ? "text-red-600" : "text-gray-400"
                              }`}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- POPUP KONFIRMASI (MODAL) --- */}
      {showConfirmExp && itemToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-lg border-0 animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                Konfirmasi Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                Apakah Anda yakin ingin menandai produksi tanggal{" "}
                <span className="font-bold">
                  {new Date(itemToConfirm.tanggal).toLocaleDateString("id-ID")}
                </span>{" "}
                ini sebagai{" "}
                <span className="font-bold text-red-600">EXPIRED / BASI</span>?
              </p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmExp(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmSetExpired}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Ya, Tandai Expired
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
