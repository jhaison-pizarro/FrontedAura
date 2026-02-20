import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  Calendar,
  Plus,
  Trash2,
  Search,
  X,
  Edit,
  Printer,
  Users,
  ShoppingCart,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function Reservas() {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [metodoPago, setMetodoPago] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Carrito de reserva
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);

  // Método de pago
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");

  // Filtros
  const [estadoFilter, setEstadoFilter] = useState("");
  const [fechaFilter, setFechaFilter] = useState("");

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);

  // Form para edición
  const {
    register,
    handleSubmit,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      cliente_nombre: "",
      cliente_telefono: "",
      cliente_documento: "",
      fecha_evento: "",
      descripcion: "",
      adelanto: "0",
      metodo_pago_id: "",
    },
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Recalcular total cuando cambia el carrito
  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    setTotal(nuevoTotal);
  }, [carrito]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProductos(), fetchMetodoPago(), fetchReservas()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/productos`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data || []);
      }
    } catch (err) {
      toast.error("Error cargando productos");
    }
  };

  const fetchMetodoPago = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/metodos-pago`);
      if (res.ok) {
        const data = await res.json();
        setMetodoPago(data || []);
      }
    } catch (err) {
      toast.error("Error cargando métodos de pago");
    }
  };

  const fetchReservas = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/reservas`);
      if (res.ok) {
        const data = await res.json();
        setReservas(data || []);
      }
    } catch (err) {
      toast.error("Error cargando reservas");
    }
  };

  // Agregar producto al carrito
  const agregarAlCarrito = (producto) => {
    const productoEnCarrito = carrito.find(
      (item) => item.producto_id === (producto.ID || producto.id)
    );

    if (productoEnCarrito) {
      const cantidadNueva = productoEnCarrito.cantidad + 1;
      const subtotalNuevo = cantidadNueva * producto.precio_venta;

      setCarrito(
        carrito.map((item) =>
          item.producto_id === (producto.ID || producto.id)
            ? {
                ...item,
                cantidad: cantidadNueva,
                subtotal: subtotalNuevo,
              }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          producto_id: producto.ID || producto.id,
          nombre: producto.nombre,
          precio: producto.precio_venta,
          cantidad: 1,
          subtotal: producto.precio_venta,
        },
      ]);
    }
    toast.success("Producto agregado al carrito");
  };

  // Actualizar cantidad en carrito
  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    setCarrito(
      carrito.map((item) =>
        item.producto_id === productoId
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precio,
            }
          : item
      )
    );
  };

  // Eliminar producto del carrito
  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter((item) => item.producto_id !== productoId));
    toast.success("Producto eliminado del carrito");
  };

  // Limpiar carrito
  const limpiarCarrito = () => {
    setCarrito([]);
    setMetodoSeleccionado("");
    reset();
  };

  // Crear/actualizar reserva
  const onSubmit = async (data) => {
    if (carrito.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!data.cliente_nombre) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    if (!data.fecha_evento) {
      toast.error("La fecha del evento es obligatoria");
      return;
    }

    setSaving(true);
    try {
      const dataToSend = {
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: data.cliente_telefono || "",
        cliente_documento: data.cliente_documento || "",
        fecha_evento: data.fecha_evento,
        descripcion: data.descripcion || "",
        adelanto: parseFloat(data.adelanto) || 0,
        metodo_pago_id: metodoSeleccionado ? parseInt(metodoSeleccionado) : 0,
        total: total,
        detalles: carrito,
      };

      const url = editId
        ? `${API_BASE_URL}/reservas/${editId}`
        : `${API_BASE_URL}/reservas`;
      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast.success(editId ? "Reserva actualizada" : "Reserva registrada");
        limpiarCarrito();
        fetchReservas();
        resetForm();
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error registrando reserva");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetchAuth(`${API_BASE_URL}/reservas/${confirmDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Reserva eliminada");
        fetchReservas();
        setConfirmDelete(null);
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al eliminar");
      }
    } catch (err) {
      toast.error("Error eliminando reserva");
    }
  };

  const handleEdit = (reserva) => {
    setValue("cliente_nombre", reserva.cliente_nombre || "");
    setValue("cliente_telefono", reserva.cliente_telefono || "");
    setValue("cliente_documento", reserva.cliente_documento || "");
    setValue("fecha_evento", reserva.fecha_evento || "");
    setValue("descripcion", reserva.descripcion || "");
    setValue("adelanto", reserva.adelanto || "0");
    setMetodoSeleccionado(reserva.metodo_pago_id || "");
    setEditId(reserva.ID || reserva.id);

    if (reserva.detalles && Array.isArray(reserva.detalles)) {
      setCarrito(
        reserva.detalles.map((item) => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          subtotal: item.subtotal,
        }))
      );
    }

    setShowModal(true);
  };

  const resetForm = () => {
    reset();
    setEditId(null);
    setShowModal(false);
    limpiarCarrito();
  };

  const handleChangeEstado = async (reservaId, nuevoEstado) => {
    try {
      const response = await fetchAuth(`${API_BASE_URL}/reservas/${reservaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (response.ok) {
        toast.success("Estado actualizado");
        fetchReservas();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (err) {
      toast.error("Error actualizando estado");
    }
  };

  const imprimirReserva = (reserva) => {
    const ventana = window.open("", "_blank", "width=400,height=600");

    ventana.document.write(
      "<!DOCTYPE html>" +
        "<html><head><title>Reserva</title>" +
        "<style>" +
        "* { margin: 0; padding: 0; box-sizing: border-box; }" +
        "body { font-family: Courier New, monospace; width: 80mm; padding: 10mm; }" +
        ".header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }" +
        ".title { font-weight: bold; font-size: 14px; }" +
        ".info { font-size: 11px; margin: 5px 0; }" +
        ".items { margin: 10px 0; border-bottom: 1px solid #000; }" +
        ".item { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }" +
        ".total { font-weight: bold; text-align: right; font-size: 12px; margin: 10px 0; }" +
        ".footer { text-align: center; font-size: 10px; margin-top: 10px; }" +
        "</style>" +
        "</head><body>" +
        '<div class="header">' +
        '<div class="title">AURA - RESERVA</div>' +
        "</div>" +
        '<div class="info">' +
        "<strong>Reserva #:</strong> " +
        (reserva.ID || reserva.id) +
        "<br>" +
        "<strong>Cliente:</strong> " +
        reserva.cliente_nombre +
        "<br>" +
        "<strong>Teléfono:</strong> " +
        reserva.cliente_telefono +
        "<br>" +
        "<strong>Evento:</strong> " +
        (reserva.fecha_evento ? new Date(reserva.fecha_evento).toLocaleDateString() : "N/A") +
        "<br>" +
        "<strong>Estado:</strong> " +
        reserva.estado +
        "<br>" +
        "</div>" +
        '<div class="items">'
    );

    if (reserva.detalles && Array.isArray(reserva.detalles)) {
      reserva.detalles.forEach((item) => {
        ventana.document.write(
          '<div class="item">' +
            "<span>" +
            item.nombre.substring(0, 20) +
            " x" +
            item.cantidad +
            "</span>" +
            "<span>S/ " +
            item.subtotal.toFixed(2) +
            "</span>" +
            "</div>"
        );
      });
    }

    ventana.document.write(
      "</div>" +
        '<div class="total">' +
        "Total: S/ " +
        (reserva.total || total).toFixed(2) +
        "<br>" +
        "Adelanto: S/ " +
        (reserva.adelanto || 0).toFixed(2) +
        "</div>" +
        '<div class="footer">' +
        "Gracias por su confianza" +
        "</div>" +
        "</body></html>"
    );

    ventana.document.close();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 300);
  };

  const getEstadoBadge = (estado) => {
    const estadoLower = (estado || "").toLowerCase();
    const badges = {
      pendiente: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
      confirmado: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      entregado: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle },
      cancelado: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
    };
    return badges[estadoLower] || badges.pendiente;
  };

  const filteredProductos = productos.filter((prod) => {
    const searchLower = searchTerm.toLowerCase();
    const nombre = (prod.nombre || "").toLowerCase();
    const descripcion = (prod.descripcion || "").toLowerCase();
    return nombre.includes(searchLower) || descripcion.includes(searchLower);
  });

  const filteredReservas = reservas.filter((res) => {
    const matchEstado = !estadoFilter || (res.estado || "").toLowerCase() === estadoFilter.toLowerCase();
    const matchFecha = !fechaFilter || (res.fecha_evento && res.fecha_evento.startsWith(fechaFilter));
    return matchEstado && matchFecha;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos de reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Reservas</h1>
        </div>
        <button
          onClick={() => {
            limpiarCarrito();
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Reserva
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <h2 className="text-xl font-bold">
                  {editId ? "Editar Reserva" : "Nueva Reserva"}
                </h2>
              </div>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-bold text-gray-700 mb-3">Productos</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {filteredProductos.map((prod) => (
                    <div
                      key={prod.ID || prod.id}
                      className="flex items-center justify-between p-2 border border-green-200 rounded-lg hover:bg-green-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-green-600 font-semibold">
                          S/ {parseFloat(prod.precio_venta).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(prod)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-bold text-gray-700 mb-3">Carrito de Reserva</h3>
                {carrito.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    No hay productos en el carrito
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {carrito.map((item) => (
                      <div
                        key={item.producto_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-800">
                            {item.nombre}
                          </p>
                          <p className="text-xs text-gray-600">
                            S/ {item.precio.toFixed(2)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidad(item.producto_id, item.cantidad - 1)
                            }
                            className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) =>
                              actualizarCantidad(
                                item.producto_id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              actualizarCantidad(item.producto_id, item.cantidad + 1)
                            }
                            className="px-2 py-1 bg-gray-300 hover:bg-gray-400 rounded text-xs"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-semibold text-sm text-green-600 w-24 text-right">
                          S/ {item.subtotal.toFixed(2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(item.producto_id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    S/ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    {...register("cliente_nombre", { required: "El nombre es obligatorio" })}
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    {...register("cliente_telefono")}
                    placeholder="+51 987 654 321"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento (DNI/RUC)
                  </label>
                  <input
                    type="text"
                    {...register("cliente_documento")}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    {...register("fecha_evento", { required: "La fecha es obligatoria" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción/Notas
                </label>
                <textarea
                  {...register("descripcion")}
                  placeholder="Detalles adicionales de la reserva..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adelanto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("adelanto")}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago del Adelanto
                  </label>
                  <select
                    value={metodoSeleccionado}
                    onChange={(e) => setMetodoSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Seleccionar...</option>
                    {metodoPago.map((metodo) => (
                      <option key={metodo.ID || metodo.id} value={metodo.ID || metodo.id}>
                        {metodo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editId ? "Actualizar Reserva" : "Registrar Reserva"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar reservas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <input
              type="date"
              value={fechaFilter}
              onChange={(e) => setFechaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Evento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">
                  Adelanto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReservas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No hay reservas registradas
                  </td>
                </tr>
              ) : (
                filteredReservas.map((reserva) => {
                  const badge = getEstadoBadge(reserva.estado);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={reserva.ID || reserva.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {reserva.cliente_nombre}
                            </p>
                            {reserva.cliente_telefono && (
                              <p className="text-xs text-gray-500">
                                {reserva.cliente_telefono}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar className="w-4 h-4" />
                          {reserva.fecha_evento
                            ? new Date(reserva.fecha_evento).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          <BadgeIcon className="w-4 h-4" />
                          {reserva.estado || "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-green-600 text-right">
                          S/ {parseFloat(reserva.total || 0).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 text-right">
                          S/ {parseFloat(reserva.adelanto || 0).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedReserva(reserva);
                              setShowDetailModal(true);
                            }}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(reserva)}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <select
                            value={reserva.estado || "pendiente"}
                            onChange={(e) => handleChangeEstado(reserva.ID || reserva.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            title="Cambiar estado"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                          <button
                            onClick={() => imprimirReserva(reserva)}
                            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(reserva.ID || reserva.id)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetailModal && selectedReserva && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6" />
                <h2 className="text-xl font-bold">Detalle de Reserva #{selectedReserva.ID || selectedReserva.id}</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-bold text-gray-800">{selectedReserva.cliente_nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-bold text-gray-800">{selectedReserva.cliente_telefono || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Documento</p>
                  <p className="font-bold text-gray-800">{selectedReserva.cliente_documento || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha del Evento</p>
                  <p className="font-bold text-gray-800">
                    {selectedReserva.fecha_evento
                      ? new Date(selectedReserva.fecha_evento).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              {selectedReserva.descripcion && (
                <div>
                  <p className="text-sm text-gray-600">Descripción</p>
                  <p className="text-gray-800">{selectedReserva.descripcion}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-800 mb-3">Productos</h3>
                {selectedReserva.detalles && Array.isArray(selectedReserva.detalles) ? (
                  <div className="space-y-2">
                    {selectedReserva.detalles.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-800">{item.nombre}</p>
                          <p className="text-xs text-gray-600">Cantidad: {item.cantidad}</p>
                        </div>
                        <p className="font-bold text-green-600">
                          S/ {parseFloat(item.subtotal || 0).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Sin productos</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>S/ {parseFloat(selectedReserva.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Adelanto:</span>
                  <span className="font-bold text-blue-600">
                    S/ {parseFloat(selectedReserva.adelanto || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600 bg-green-50 p-2 rounded">
                  <span>Total a pagar:</span>
                  <span>
                    S/ {(parseFloat(selectedReserva.total || 0) - parseFloat(selectedReserva.adelanto || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => imprimirReserva(selectedReserva)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Confirmar Eliminación
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
