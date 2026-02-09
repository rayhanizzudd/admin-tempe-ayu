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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, User } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem("token");

export default function KaryawanPage() {
  const [showForm, setShowForm] = useState(false);
  const [karyawanList, setKaryawanList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nama: "",
    nomor: "",
    gaji_harian: 0,
    status_aktif: "true", // String agar kompatibel dengan Select
  });

  useEffect(() => {
    fetchKaryawan();
  }, []);

  const fetchKaryawan = async () => {
    try {
      const response = await axios.get(`${API}/karyawan`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setKaryawanList(response.data);
    } catch (error) {
      console.error("Error fetching karyawan:", error);
    }
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setFormData({
      nama: item.nama,
      nomor: item.nomor,
      gaji_harian: item.gaji_harian,
      status_aktif: item.status_aktif ? "true" : "false",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Konversi status_aktif ke boolean
    const payload = {
      ...formData,
      status_aktif: formData.status_aktif === "true",
      gaji_harian: parseInt(formData.gaji_harian),
    };

    try {
      if (editId) {
        await axios.put(`${API}/karyawan/${editId}`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Data karyawan berhasil diperbarui!");
      } else {
        await axios.post(`${API}/karyawan`, payload, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        toast.success("Karyawan baru berhasil ditambahkan!");
        toast.info(
          "Akun login dibuat: Username = Nama (tanpa spasi), Pass = 12345678",
        );
      }

      setShowForm(false);
      resetForm();
      fetchKaryawan();
    } catch (error) {
      console.error("Error submit:", error);
      let msg = "Gagal menyimpan data!";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({
      nama: "",
      nomor: "",
      gaji_harian: 0,
      status_aktif: "true",
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  return (
    <div data-testid="karyawan-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Manajemen Karyawan
          </h1>
          <p className="text-gray-600 mt-1">Kelola data karyawan dan akun</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
          className="bg-lime-500 hover:bg-lime-600 text-white"
        >
          <Plus className="h-5 w-5 mr-2" />
          {showForm ? "Tutup Form" : "Tambah Karyawan"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader>
            <CardTitle>
              {editId ? "Edit Karyawan" : "Tambah Karyawan Baru"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input
                    id="nama"
                    placeholder="Contoh: Sutarjo"
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    required
                  />
                  {!editId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Username login akan dibuat otomatis dari nama ini.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nomor">Nomor HP / ID</Label>
                  <Input
                    id="nomor"
                    type="number"
                    placeholder="Contoh: 08123456789"
                    value={formData.nomor}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="gaji">Gaji Harian (Rp)</Label>
                  <Input
                    id="gaji"
                    type="number"
                    value={formData.gaji_harian}
                    onChange={(e) =>
                      setFormData({ ...formData, gaji_harian: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status_aktif}
                    onValueChange={(val) =>
                      setFormData({ ...formData, status_aktif: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Aktif</SelectItem>
                      <SelectItem value="false">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
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
          <CardTitle>Daftar Karyawan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Nomor HP/ID</TableHead>
                  <TableHead>Gaji Harian</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {karyawanList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      Belum ada data karyawan.
                    </TableCell>
                  </TableRow>
                ) : (
                  karyawanList.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        {item.nama}
                      </TableCell>
                      <TableCell>{item.nomor}</TableCell>
                      <TableCell>{formatRupiah(item.gaji_harian)}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status_aktif
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status_aktif ? "Aktif" : "Non-Aktif"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
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
