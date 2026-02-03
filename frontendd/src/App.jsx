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
import Layout from "@/components/Layout";

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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
