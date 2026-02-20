
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  X,
  Edit,
  Printer,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function Ventas() {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [metodoPago, setMetodoPago] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Carrito de compras
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);

  // Método de pago
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("");

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showEliminadosModal, setShowEliminadosModal] = useState(false);
  const [listaEliminados, setListaEliminados] = useState([]);
  const [loadingEliminados, setLoadingEliminados] = useState(false);

  // Form para edición
  const {
    register,
    handleSubmit,
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      cliente_nombre: "",
      cliente_documento: "",
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
      await Promise.all([fetchProductos(), fetchMetodoPago(), fetchVentas()]);
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

  const fetchVentas = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/ventas`);
      if (res.ok) {
        const data = await res.json();
        setVentas(data || []);
      }
    } catch (err) {
      toast.error("Error cargando ventas");
    }
  };

  const fetchVentasEliminadas = async () => {
    try {
      setLoadingEliminados(true);
      const res = await fetchAuth(`${API_BASE_URL}/ventas/eliminados`);
      if (res.ok) {
        const data = await res.json();
        setListaEliminados(data || []);
      }
    } catch (err) {
      toast.error("Error cargando ventas eliminadas");
    } finally {
      setLoadingEliminados(false);
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
          precio_venta: producto.precio_venta,
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
              subtotal: nuevaCantidad * item.precio_venta,
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

  // Crear venta
  const onSubmit = async (data) => {
    if (carrito.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!metodoSeleccionado) {
      toast.error("Seleccione un método de pago");
      return;
    }

    setSaving(true);
    try {
      const dataToSend = {
        cliente_nombre: data.cliente_nombre || "Sin especificar",
        cliente_documento: data.cliente_documento || "",
        metodo_pago_id: parseInt(metodoSeleccionado),
        productos: carrito,
        total: total,
      };

      const url = editId
        ? `${API_BASE_URL}/ventas/${editId}`
        : `${API_BASE_URL}/ventas`;
      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast.success(editId ? "Venta actualizada" : "Venta registrada");
        limpiarCarrito();
        fetchVentas();
        resetForm();
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error registrando venta");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetchAuth(`${API_BASE_URL}/ventas/${confirmDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Venta eliminada");
        fetchVentas();
        setConfirmDelete(null);
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al eliminar");
      }
    } catch (err) {
      toast.error("Error eliminando venta");
    }
  };

  const handleEdit = (venta) => {
    setValue("cliente_nombre", venta.cliente_nombre || "");
    setValue("cliente_documento", venta.cliente_documento || "");
    setMetodoSeleccionado(venta.metodo_pago_id || "");
    setEditId(venta.ID || venta.id);

    if (venta.detalles && Array.isArray(venta.detalles)) {
      setCarrito(
        venta.detalles.map((item) => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          precio_venta: item.precio_venta,
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
  };

  const imprimirTicket = (venta) => {
    const ventana = window.open("", "_blank", "width=400,height=600");

    ventana.document.write(
      "<!DOCTYPE html>" +
        "<html><head><title>Ticket Venta</title>" +
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
        '<div class="title">AURA</div>' +
        '<div class="info">Ticket de Venta</div>' +
        "</div>" +
        '<div class="info">' +
        "<strong>Venta #:</strong> " +
        (venta.ID || venta.id) +
        "<br>" +
        "<strong>Cliente:</strong> " +
        (venta.cliente_nombre || "N/A") +
        "<br>" +
        "<strong>Método de Pago:</strong> " +
        (venta.metodo_nombre || "N/A") +
        "<br>" +
        "<strong>Fecha:</strong> " +
        (venta.fecha ? new Date(venta.fecha).toLocaleDateString() : new Date().toLocaleDateString()) +
        "<br>" +
        "</div>" +
        '<div class="items">'
    );

    if (venta.detalles && Array.isArray(venta.detalles)) {
      venta.detalles.forEach((item) => {
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
        (venta.total || total).toFixed(2) +
        "</div>" +
        '<div class="footer">' +
        "Gracias por su compra" +
        "</div>" +
        "</body></html>"
    );

    ventana.document.close();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 300);
  };

  const filteredProductos = productos.filter((prod) => {
    const searchLower = searchTerm.toLowerCase();
    const nombre = (prod.nombre || "").toLowerCase();
    const descripcion = (prod.descripcion || "").toLowerCase();
    return nombre.includes(searchLower) || descripcion.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Ventas</h1>
        </div>
        <button
          onClick={() => {
            limpiarCarrito();
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Venta
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6" />
                <h2 className="text-xl font-bold">
                  {editId ? "Editar Venta" : "Nueva Venta"}
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {filteredProductos.map((prod) => (
                    <div
                      key={prod.ID || prod.id}
                      className="flex items-center justify-between p-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-blue-600 font-semibold">
                          S/ {parseFloat(prod.precio_venta).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarAlCarrito(prod)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-bold text-gray-700 mb-3">Carrito de Compra</h3>
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
                            S/ {item.precio_venta.toFixed(2)} c/u
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
                        <p className="font-semibold text-sm text-blue-600 w-24 text-right">
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

              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    S/ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    {...register("cliente_nombre")}
                    placeholder="Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documento (Opcional)
                  </label>
                  <input
                    type="text"
                    {...register("cliente_documento")}
                    placeholder="DNI o RUC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={metodoSeleccionado}
                  onChange={(e) => setMetodoSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {metodoPago.map((metodo) => (
                    <option key={metodo.ID || metodo.id} value={metodo.ID || metodo.id}>
                      {metodo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editId ? "Actualizar Venta" : "Registrar Venta"}
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

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex justify-end p-4 border-b">
          <button
            onClick={() => {
              fetchVentasEliminadas();
              setShowEliminadosModal(true);
            }}
            className="text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors"
          >
            Ver registros eliminados
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Método Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  Productos
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No hay ventas registradas
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.ID || venta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {venta.cliente_nombre || "Sin especificar"}
                          </p>
                          {venta.cliente_documento && (
                            <p className="text-xs text-gray-500">
                              {venta.cliente_documento}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {venta.metodo_nombre || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {venta.detalles ? venta.detalles.length : "0"} producto(s)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-blue-600 text-right">
                        S/ {parseFloat(venta.total || 0).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(venta)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => imprimirTicket(venta)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="Imprimir ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(venta.ID || venta.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEliminadosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-6 h-6" />
                <h2 className="text-xl font-bold">Ventas Eliminadas</h2>
              </div>
              <button
                onClick={() => setShowEliminadosModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingEliminados ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : listaEliminados.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay ventas eliminadas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                          Fecha Eliminación
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {listaEliminados.map((venta) => (
                        <tr key={venta.ID || venta.id}>
                          <td className="px-4 py-3 text-gray-800">
                            {venta.cliente_nombre || "Sin especificar"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-red-600">
                            S/ {parseFloat(venta.total || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {venta.fecha_eliminacion
                              ? new Date(venta.fecha_eliminacion).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                ¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.
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
