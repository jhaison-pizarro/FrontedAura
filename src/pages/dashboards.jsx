import { useState, useEffect } from "react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  ShoppingCart,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"];

export default function Dashboards() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ventasHoy: 0,
    reservasHoy: 0,
    totalDia: 0,
    ventasSemana: [],
    reservasPendientes: 0,
    reservasProximas: [],
    productosStock: 0,
    productosBajo: 0,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const promises = [
        fetchAuth(`${API_BASE_URL}/dashboard/ventas-hoy`).then(r => r.ok ? r.json() : null),
        fetchAuth(`${API_BASE_URL}/dashboard/reservas-hoy`).then(r => r.ok ? r.json() : null),
        fetchAuth(`${API_BASE_URL}/dashboard/ventas-semana`).then(r => r.ok ? r.json() : null),
        fetchAuth(`${API_BASE_URL}/dashboard/reservas-proximas`).then(r => r.ok ? r.json() : null),
        fetchAuth(`${API_BASE_URL}/dashboard/productos-stock`).then(r => r.ok ? r.json() : null),
      ];

      const [ventasHoy, reservasHoy, ventasSemana, reservasProximas, productosStock] = await Promise.all(promises);

      setStats({
        ventasHoy: ventasHoy?.total || 0,
        reservasHoy: reservasHoy?.total || 0,
        totalDia: (ventasHoy?.total || 0) + (reservasHoy?.total || 0),
        ventasSemana: ventasSemana?.datos || [],
        reservasPendientes: reservasProximas?.pendientes || 0,
        reservasProximas: reservasProximas?.proximas || [],
        productosStock: productosStock?.total || 0,
        productosBajo: productosStock?.bajo || 0,
      });
    } catch (err) {

    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={cargarDatos}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Ventas Hoy</p>
              <p className="text-3xl font-bold">S/ {stats.ventasHoy.toFixed(2)}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm mb-1">Reservas Hoy</p>
              <p className="text-3xl font-bold">S/ {stats.reservasHoy.toFixed(2)}</p>
            </div>
            <Calendar className="w-12 h-12 text-pink-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Total Día</p>
              <p className="text-3xl font-bold">S/ {stats.totalDia.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Reservas Pendientes</p>
              <p className="text-3xl font-bold">{stats.reservasPendientes}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de ventas de la semana */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ventas de la Semana</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.ventasSemana}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="monto" fill="#8B5CF6" name="Monto (S/)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Estado de stock */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Estado de Stock</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Productos en Stock</p>
                  <p className="text-2xl font-bold text-green-600">{stats.productosStock}</p>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-10 h-10 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Stock Bajo</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.productosBajo}</p>
                </div>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Reservas próximas */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Reservas Próximas</h2>
        {stats.reservasProximas.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay reservas próximas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Evento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.reservasProximas.map((reserva, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{reserva.cliente}</td>
                    <td className="px-4 py-3 text-sm">{reserva.fecha}</td>
                    <td className="px-4 py-3 text-sm font-medium">S/ {reserva.total}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        reserva.estado === "confirmado" ? "bg-green-100 text-green-700" :
                        reserva.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {reserva.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
