import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Penjualan from "@/pages/Penjualan";
import ReturnPage from "@/pages/ReturnPage";
import Produksi from "@/pages/Produksi";
import Pengeluaran from "@/pages/Pengeluaran";
import LaporanLaba from "@/pages/LaporanLaba";
import Stok from "@/pages/Stok";
import Karyawan from "@/pages/Karyawan";
import Gaji from "@/pages/GajiKaryawan";
import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token");
    return token ? children : <Navigate to="/login" replace />;
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={<Login setIsAuthenticated={setIsAuthenticated} />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/penjualan"
            element={
              <ProtectedRoute>
                <Layout>
                  <Penjualan />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/return"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReturnPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produksi"
            element={
              <ProtectedRoute>
                <Layout>
                  <Produksi />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stok"
            element={
              <ProtectedRoute>
                <Layout>
                  <Stok />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pengeluaran"
            element={
              <ProtectedRoute>
                <Layout>
                  <Pengeluaran />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/laporan-laba"
            element={
              <ProtectedRoute>
                <Layout>
                  <LaporanLaba />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/karyawan"
            element={
              <ProtectedRoute>
                <Layout>
                  <Karyawan />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gaji"
            element={
              <ProtectedRoute>
                <Layout>
                  <Gaji />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
