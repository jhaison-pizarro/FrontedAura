// src/pages/Combos.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { fetchAuth } from "../funciones/auth";
import { ChevronRight, ChevronDown, Layers } from "lucide-react";
import VoiceMicButton from "../components/VoiceMicButton";
import { API_BASE_URL } from "../config";
import { buildImageUrl } from "../funciones/imageUtils";

const API_BASE = API_BASE_URL;

export default function Combos() {
  const [combos, setCombos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedProductos, setSelectedProductos] = useState([]);
  const [editId, setEditId] = useState(null);

  const [showCategorias, setShowCategorias] = useState(false);
  const [showModalProductos, setShowModalProductos] = useState(false);
  const [showProductPanel, setShowProductPanel] = useState(false); // Panel inline de categorías/productos
  const [activeCategoria, setActiveCategoria] = useState(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  const [imagenGrande, setImagenGrande] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [codigoBarrasCombo, setCodigoBarrasCombo] = useState("");

  // Toggle para expandir/colapsar categoría
  const toggleCategoria = (id) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm();

  // ---------- Fetch inicial ----------
  useEffect(() => {
    fetchCategorias();
    fetchCombos();
  }, []);

  // Listener para llenado de combo por voz
  useEffect(() => {
    const handleVoiceComboFill = async (e) => {
      const data = e.detail;
      if (!data) return;

      const campos = [
        { key: "nombre", label: "Nombre" },
        { key: "descripcion", label: "Descripción" },
        { key: "precio_oferta", label: "Precio oferta" },
      ];

      for (const campo of campos) {
        if (data[campo.key] !== undefined && data[campo.key] !== "") {
          setValue(campo.key, String(data[campo.key]));
          const el = document.querySelector(`[name="${campo.key}"]`);
          if (el) {
            el.classList.add("voice-filling");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          await new Promise((r) => setTimeout(r, 250));
          if (el) el.classList.remove("voice-filling");
        }
      }

      // Advertir si no hay productos seleccionados
      if (selectedProductos.length < 2) {
        toast.info("Recuerda agregar al menos 2 productos al combo");
      }
    };

    window.addEventListener("voice:fill-combo-form", handleVoiceComboFill);
    return () => window.removeEventListener("voice:fill-combo-form", handleVoiceComboFill);
  }, [setValue, selectedProductos.length]);

  async function fetchCategorias() {
    try {
      const res = await fetchAuth(`${API_BASE}/categorias`);
      const data = await res.json();
      setCategorias(data.categorias || data || []);
    } catch (err) {
      setCategorias([]);
    }
  }

  async function fetchCombos() {
    try {
      const res = await fetchAuth(`${API_BASE}/combos`);
      const data = await res.json();
      setCombos(data.combos || data || []);
    } catch (err) {
      setCombos([]);
    }
  }

  // ---------- Productos por categoría ----------
  async function handleMostrarProductos(categoriaId) {
    try {
      setActiveCategoria(categoriaId);
      const res = await fetchAuth(
        `${API_BASE}/categorias/${categoriaId}/productos`
      );
      if (!res.ok) throw new Error("Error cargando productos");
      const data = await res.json();
      setProductos(data.productos || data || []);
      setShowModalProductos(true);
    } catch (err) {
      toast.error("Error cargando productos de la categoría");
    }
  }

  // ---------- Agregar / quitar productos seleccionados ----------
  const agregarProducto = (producto) => {
    const pid = producto.ID || producto.id;
    if (selectedProductos.some((p) => (p.ID || p.id) === pid)) return;
    setSelectedProductos((prev) => [...prev, producto]);
    clearErrors("productos");
  };

  const removerProductoById = (productoId) => {
    setSelectedProductos((prev) =>
      prev.filter((p) => (p.ID || p.id) !== productoId)
    );
  };

  const productosParaBackend = (lista) =>
    lista.map((p) => ({
      nombre: p.nombre,
      precio: Number(p.precio_alquiler ?? 0),
    }));

  // ---------- Crear / actualizar combo (validado con react-hook-form) ----------
  const onSubmit = async (data) => {
    // Requerir al menos 2 productos (por ser combo)
    if (selectedProductos.length < 2) {
      setError("productos", {
        type: "manual",
        message: "Selecciona al menos 2 productos para crear un combo.",
      });
      return;
    }

    // Validar que el precio de oferta sea menor que el total original
    const precioOferta = Number(data.precio_oferta);
    if (precioOferta >= totalOriginal) {
      setError("precio_oferta", {
        type: "manual",
        message: `El precio de oferta debe ser menor que S/ ${(Math.round(totalOriginal * 100) / 100).toFixed(2)}`,
      });
      return;
    }

    const payload = {
      nombre: data.nombre,
      descripcion: data.descripcion || "",
      precio_oferta: Number(data.precio_oferta),
      productos: productosParaBackend(selectedProductos),
    };

    try {
      setLoading(true);
      let res;
      if (editId) {
        res = await fetchAuth(`${API_BASE}/combos/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchAuth(`${API_BASE}/combos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Error guardando combo");

      // éxito -> limpiar y recargar
      reset();
      setSelectedProductos([]);
      setEditId(null);
      setShowProductPanel(false);
      setActiveCategoria(null);
      fetchCombos();
      toast.success(editId ? "Combo actualizado!" : "Combo creado!");
    } catch (err) {
      toast.error("Error guardando combo.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Editar combo ----------
  function handleEdit(combo) {
    setValue("nombre", combo.nombre || "");
    setValue("descripcion", combo.descripcion || "");
    setValue("precio_oferta", combo.precio_oferta?.toString() || "");
    const prodList = (combo.productos || []).map((p) => ({
      ID: p.ID || p.id,
      id: p.id || p.ID,
      nombre: p.nombre,
      precio_alquiler: p.precio_alquiler ?? p.precio ?? 0,
      modelo: p.modelo,
      imagen: p.imagen,
      stock: p.stock,
    }));
    setSelectedProductos(prodList);
    setEditId(combo.ID || combo.id || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    clearErrors("productos");
  }

  // ---------- Eliminar combo ----------
  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      const res = await fetchAuth(`${API_BASE}/combos/${confirmDeleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar combo");
      toast.success("Combo eliminado exitosamente");
      fetchCombos();
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error("Error eliminando combo");
    }
  }

  const totalOriginal = selectedProductos.reduce(
    (acc, p) => acc + Number(p.precio_alquiler ?? 0),
    0
  );

  // ---------- Wrapper para abrir productos desde la lista de categorías ----------
  const onCategoriaClick = (categoriaId) => {
    setShowCategorias(false);
    handleMostrarProductos(categoriaId);
  };

  // Versión para el panel inline
  const onCategoriaClickPanel = (categoriaId) => {
    handleMostrarProductosPanel(categoriaId);
  };

  async function handleMostrarProductosPanel(categoriaId) {
    try {
      setActiveCategoria(categoriaId);
      const res = await fetchAuth(
        `${API_BASE}/categorias/${categoriaId}/productos`
      );
      if (!res.ok) throw new Error("Error cargando productos");
      const data = await res.json();
      setProductos(data.productos || data || []);
    } catch (err) {
      toast.error("Error cargando productos de la categoría");
    }
  }

  // ---------- Buscar producto por código de barras ----------
  const findCategoriaById = (cats, targetId) => {
    for (const cat of cats) {
      const id = cat.ID || cat.id;
      if (id === targetId) return cat;
      const sub = cat.SubCategorias || cat.subcategorias || [];
      if (sub.length > 0) {
        const found = findCategoriaById(sub, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const buscarPorCodigoCombo = async (codigo) => {
    if (!codigo || !codigo.trim()) {
      toast.warning("Ingresa un código");
      return;
    }

    try {
      const response = await fetchAuth(`${API_BASE}/productos/codigo/${codigo}`);
      if (!response.ok) throw new Error("Producto no encontrado");

      const res = await response.json();
      const producto = res.producto || res || null;

      if (!producto) {
        toast.error("Producto no encontrado");
        return;
      }

      // Agregar al combo
      agregarProducto(producto);

      // Navegar a la categoría del producto
      const catId = producto.categoria_id || producto.CategoriaID || producto.categoriaId;
      if (catId) {
        setActiveCategoria(catId);
        await handleMostrarProductosPanel(catId);
      }

      toast.success(`Producto agregado: ${producto.nombre}`);
    } catch (err) {
      toast.error("Producto no encontrado o error en la búsqueda");
    }
  };

  // ---------- Render recursivo de categorías ----------
  function renderCategoriasList(cats = [], onShowProducts, nivel = 0) {
    return cats.map((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre || "Sin nombre";
      const sub = cat.SubCategorias || cat.subcategorias || [];
      const tieneHijos = sub.length > 0;
      const estaExpandida = categoriasExpandidas[id] ?? false;
      const estaSeleccionada = activeCategoria === id;

      return (
        <div key={id} className="mb-1" style={{ marginLeft: nivel * 12 }}>
          <div
            onClick={() => onShowProducts(id)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 ${
              estaSeleccionada
                ? "bg-blue-500 text-white border-blue-500 shadow-md"
                : "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {nivel > 0 && (
                <span className={`text-sm flex-shrink-0 ${estaSeleccionada ? "text-white/70" : "text-gray-400"}`}>↳</span>
              )}
              {tieneHijos && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCategoria(id); }}
                  className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                    estaSeleccionada ? "hover:bg-white/20" : "hover:bg-sky-200"
                  }`}
                >
                  {estaExpandida ? (
                    <ChevronDown size={12} className={estaSeleccionada ? "text-white" : "text-sky-600"} />
                  ) : (
                    <ChevronRight size={12} className={estaSeleccionada ? "text-white" : "text-sky-600"} />
                  )}
                </button>
              )}
              <span className={`text-xs font-medium truncate ${estaSeleccionada ? "text-white" : "text-gray-700"}`}>{nombre}</span>
            </div>
            {tieneHijos && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                estaSeleccionada ? "bg-white/20 text-white" : "text-blue-600 bg-blue-100"
              }`}>
                {sub.length}
              </span>
            )}
          </div>

          {/* Subcategorías - solo si está expandida */}
          {tieneHijos && estaExpandida && (
            <div className="mt-1">
              {renderCategoriasList(sub, onShowProducts, nivel + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  // ---------- JSX ----------
  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Layers className="w-6 h-6" />
          COMBOS
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PANEL IZQUIERDO: FORMULARIO (1 col) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-1">
          <div className="bg-blue-400 p-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              {editId ? "✏️ EDITAR COMBO" : "➕ CREAR COMBO"}
            </h2>
            <VoiceMicButton
              accion="crear_combo"
              getFormContext={() => ({
                campos: getValues(),
                productosSeleccionados: selectedProductos.map(p => ({
                  nombre: p.nombre,
                  talla: p.talla ?? "-",
                  color: p.color ?? "-",
                  precio: p.precio_alquiler ?? p.precio_venta ?? 0,
                })),
                totalProductos: selectedProductos.length,
                editando: !!editId,
              })}
            />
          </div>
          <div className="p-4 bg-sky-50">

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* NOMBRE */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-blue-50 px-1 text-xs font-medium text-gray-700">
              Nombre del Combo <span className="text-red-500">*</span>
            </label>
            <input
              {...register("nombre", { required: "El nombre es requerido" })}
              type="text"
              className="w-full border rounded p-2 text-sm"
            />
            {errors.nombre && (
              <span className="text-red-500 text-xs">
                {errors.nombre.message}
              </span>
            )}
          </div>

          {/* PRECIO OFERTA */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-blue-50 px-1 text-xs font-medium text-gray-700">
              Precio de Oferta <span className="text-red-500">*</span>
            </label>
            <input
              {...register("precio_oferta", {
                required: "El precio de oferta es requerido",
                valueAsNumber: true,
                min: { value: 0.01, message: "Debe ser mayor a 0" },
              })}
              type="number"
              step="0.01"
              className="w-full border rounded p-2 text-sm"
            />
            {errors.precio_oferta && (
              <span className="text-red-500 text-xs">
                {errors.precio_oferta.message}
              </span>
            )}
          </div>

          {/* PRODUCTOS SELECCIONADOS */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <label className="font-medium text-sm text-gray-700">
                Productos ({selectedProductos.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowProductPanel(!showProductPanel);
                  if (!showProductPanel) fetchCategorias();
                }}
                className={`ml-auto px-3 py-1 text-white text-xs rounded ${
                  showProductPanel
                    ? "bg-gray-500 hover:bg-gray-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {showProductPanel ? "✕ Cerrar panel" : "+ Agregar"}
              </button>
            </div>

            {/* Input de escaneo de código de barras */}
            <div className="flex gap-1.5 mb-2">
              <input
                type="text"
                value={codigoBarrasCombo}
                onChange={(e) => setCodigoBarrasCombo(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && codigoBarrasCombo.trim()) {
                    await buscarPorCodigoCombo(codigoBarrasCombo);
                    setCodigoBarrasCombo("");
                  }
                }}
                placeholder="Escanear código de barras..."
                className="flex-1 border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                type="button"
                onClick={async () => {
                  if (codigoBarrasCombo.trim()) {
                    await buscarPorCodigoCombo(codigoBarrasCombo);
                    setCodigoBarrasCombo("");
                  }
                }}
                disabled={!codigoBarrasCombo.trim()}
                className={`px-2 py-1.5 text-xs rounded font-medium ${
                  codigoBarrasCombo.trim()
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Buscar
              </button>
            </div>

            <div className="p-2 border rounded max-h-36 overflow-y-auto bg-white text-sm">
              {selectedProductos.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-2">
                  Sin productos. Escanea o agrega desde el panel.
                </p>
              ) : (
                selectedProductos.map((p) => {
                  const pid = p.ID || p.id;
                  const imgUrl = buildImageUrl(
                    p.imagen || p.imagen_url || p.imagenPath || ""
                  );
                  return (
                    <div
                      key={pid}
                      className="flex items-center gap-2 py-1.5 border-b last:border-b-0"
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.nombre}
                          className="w-10 h-10 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400"
                          onClick={() => setImagenGrande(imgUrl)}
                          title="Clic para ampliar"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center text-[9px] text-gray-400 flex-shrink-0">
                          Sin img
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{p.nombre}</div>
                        <div className="text-[10px] text-gray-500">
                          {p.talla ? `Talla: ${p.talla}` : ""}{p.talla && p.color ? " · " : ""}{p.color ? `Color: ${p.color}` : ""}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          S/ {(Math.round(Number(p.precio_alquiler ?? 0) * 100) / 100).toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerProductoById(pid)}
                        className="px-1.5 py-0.5 text-[10px] bg-red-500 hover:bg-red-600 text-white rounded ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            {errors.productos && (
              <span className="text-red-500 text-xs mt-1 block">
                {errors.productos.message}
              </span>
            )}
            <div className="mt-1 text-xs text-gray-600">
              Total original: <strong>S/ {(Math.round(totalOriginal * 100) / 100).toFixed(2)}</strong>
            </div>
          </div>

          {/* DESCRIPCIÓN (opcional, al final) */}
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-blue-50 px-1 text-xs font-medium text-gray-700">
              Descripción <span className="text-gray-400 text-[10px]">(opcional)</span>
            </label>
            <textarea
              {...register("descripcion")}
              rows={2}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          {/* BOTONES */}
          <div className="flex gap-2">
            <button
              id="btn-guardar-combo"
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded text-white ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Guardando..."
                : editId
                ? "Actualizar combo"
                : "Crear combo"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setSelectedProductos([]);
                setEditId(null);
                clearErrors();
              }}
              className="px-4 py-2 rounded border bg-sky-200 hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
          </form>
          </div>
        </div>

        {/* PANEL DERECHO: COMBOS o SELECCIONAR PRODUCTOS (2 cols) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2 relative">
          {/* --- VISTA: LISTA DE COMBOS --- */}
          {!showProductPanel && (
            <>
              <div className="bg-blue-300 p-3">
                <h2 className="text-sm font-bold text-center text-white">
                  LISTA DE COMBOS
                </h2>
              </div>
              <div className="p-4">
                <div className="max-h-[70vh] overflow-y-auto space-y-1.5 pr-2">
                  {combos.length === 0 ? (
                    <p className="text-xs text-gray-500">No hay combos creados.</p>
                  ) : (
                    combos.map((combo) => {
                      const comboId = combo.ID || combo.id;
                      const nombres = (combo.productos || [])
                        .map((p) => p.nombre)
                        .filter(Boolean);
                      return (
                        <div
                          key={comboId}
                          className="flex items-center justify-between p-2 border rounded bg-sky-50 shadow-sm hover:bg-sky-100 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-800 truncate">
                              {combo.nombre}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {nombres.length ? nombres.join(", ") : "Sin productos"}
                            </p>
                            <div className="text-xs text-green-600 font-medium mt-0.5">
                              Oferta: S/ {(Math.round(Number(combo.precio_oferta ?? 0) * 100) / 100).toFixed(2)}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 ml-3">
                            <button
                              onClick={() => handleEdit(combo)}
                              className="px-2.5 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(comboId)}
                              className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* --- VISTA: SELECCIONAR PRODUCTOS (reemplaza la lista de combos) --- */}
          {showProductPanel && (
            <>
              <div className="bg-green-500 p-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">
                  SELECCIONAR PRODUCTOS
                  <span className="ml-2 text-xs font-normal opacity-80">
                    ({selectedProductos.length} seleccionados)
                  </span>
                </h2>
                <button
                  onClick={() => setShowProductPanel(false)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded"
                >
                  Volver a combos
                </button>
              </div>

              <div className="flex flex-col md:flex-row h-auto md:h-[70vh]">
                {/* Lado izquierdo: Categorías */}
                <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r overflow-y-auto p-3 space-y-1 bg-gray-50 max-h-[40vh] md:max-h-none">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Categorías</p>
                  {categorias.length === 0 ? (
                    <p className="text-sm text-gray-400">Cargando...</p>
                  ) : (
                    renderCategoriasList(categorias, onCategoriaClickPanel)
                  )}
                </div>

                {/* Lado derecho: Productos de la categoría seleccionada */}
                <div className="w-full md:w-1/2 overflow-y-auto p-3 space-y-2 max-h-[40vh] md:max-h-none">
                  {!activeCategoria ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      Selecciona una categoría para ver sus productos
                    </div>
                  ) : productos.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay productos en esta categoría.</p>
                  ) : (
                    productos.map((prod) => {
                      const productoId = prod.ID || prod.id;
                      const already = selectedProductos.some(
                        (p) => (p.ID || p.id) === productoId
                      );
                      const precioNum = Math.round(Number(prod.precio_alquiler ?? prod.precio_venta ?? 0) * 100) / 100;
                      const precio = precioNum.toFixed(2);
                      const imageUrl = buildImageUrl(
                        prod.imagen || prod.imagen_url || prod.imagenPath || ""
                      );
                      return (
                        <div
                          key={productoId}
                          className={`flex items-center justify-between p-2 border rounded text-sm ${
                            already ? "bg-green-50 border-green-300" : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={prod.nombre}
                                className="w-12 h-12 object-cover rounded border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400"
                                onClick={(e) => { e.stopPropagation(); setImagenGrande(imageUrl); }}
                                title="Clic para ampliar"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
                                Sin img
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{prod.nombre}</div>
                              <div className="text-xs text-gray-600">
                                Talla: {prod.talla ?? "-"} · Color: {prod.color ?? "-"} · Modelo: {prod.modelo ?? "-"}
                              </div>
                              <div className="text-xs text-gray-500">
                                Stock: {prod.stock ?? 0} · S/ {precio}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              already
                                ? removerProductoById(productoId)
                                : agregarProducto(prod)
                            }
                            className={`px-3 py-1.5 text-xs rounded flex-shrink-0 ml-2 font-medium ${
                              already
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                          >
                            {already ? "Quitar" : "Agregar"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: CATEGORÍAS */}
      {showCategorias && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end sm:pr-4 pt-4 pb-4 px-2 sm:px-0">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCategorias(false)}
          />
          <div className="relative bg-white rounded shadow-lg w-[90%] sm:w-[min(500px,50%)] max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">Categorías</h3>
              <button
                onClick={() => setShowCategorias(false)}
                className="px-3 py-1 rounded border"
              >
                Cerrar
              </button>
            </div>
            <div className="p-4 space-y-2">
              {categorias.length === 0 ? (
                <p className="text-sm text-gray-500">Cargando categorías...</p>
              ) : (
                renderCategoriasList(categorias, onCategoriaClick)
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTOS */}
      {showModalProductos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end sm:pr-4 pt-4 pb-4 px-2 sm:px-0">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModalProductos(false)}
          />
          <div className="relative bg-white rounded shadow-lg w-[90%] sm:w-[min(600px,50%)] max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold min-w-0">
                Productos de la categoría {activeCategoria}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-sm text-gray-700">
                  Seleccionados: {selectedProductos.length}
                </div>
                <button
                  onClick={() => setShowModalProductos(false)}
                  className="px-3 py-1 rounded border"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2 text-sm">
              {productos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay productos en esta categoría.
                </p>
              ) : (
                productos.map((prod) => {
                  const productoId = prod.ID || prod.id;
                  const already = selectedProductos.some(
                    (p) => (p.ID || p.id) === productoId
                  );
                  const precioNum = Math.round(Number(prod.precio_alquiler ?? prod.precio_venta ?? 0) * 100) / 100;
                  const precio = precioNum.toFixed(2);
                  const imageUrl = buildImageUrl(
                    prod.imagen || prod.imagen_url || prod.imagenPath || ""
                  );
                  return (
                    <div
                      key={productoId}
                      className="flex items-center justify-between p-2 border rounded bg-gray-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={prod.nombre}
                            className="w-12 h-12 object-cover rounded border cursor-pointer hover:ring-2 hover:ring-blue-400"
                            onClick={() => setImagenGrande(imageUrl)}
                            title="Clic para ampliar"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                            No img
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium">{prod.nombre}</div>
                          <div className="text-xs text-gray-600">
                            Talla: {prod.talla ?? "-"} · Color: {prod.color ?? "-"} · Modelo: {prod.modelo ?? "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock: {prod.stock ?? 0} · S/ {precio}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-2">
                        {imageUrl && (
                          <button
                            onClick={() => setImagenGrande(imageUrl)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                          >
                            Ver imagen
                          </button>
                        )}

                        {already ? (
                          <button
                            onClick={() => removerProductoById(productoId)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            Quitar
                          </button>
                        ) : (
                          <button
                            onClick={() => agregarProducto(prod)}
                            className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMAGEN GRANDE */}
      {imagenGrande && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4" onClick={() => setImagenGrande(null)}>
          <div className="relative max-w-2xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={imagenGrande}
              alt="Foto ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setImagenGrande(null)}
              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-5 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
              ¿Eliminar este combo?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Esta acción no se puede deshacer. El combo será eliminado permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .voice-filling {
          outline: 2px solid #3b82f6 !important;
          background-color: #eff6ff !important;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
