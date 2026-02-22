import { useState, useEffect, useRef, useCallback } from "react";
import JsBarcode from "jsbarcode";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  Package,
  Pencil,
  Trash2,
  Search,
  X,
  Printer,
  Camera,
  Paperclip,
  ChevronRight,
  ChevronDown,
  QrCode,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { buildImageUrl } from "../funciones/imageUtils";
import { comprimirImagen } from "../funciones/funciones";
import VoiceMicButton from "../components/VoiceMicButton";
import { useSessionState, useFormPersist } from "../funciones/useSessionState";

export default function Productos() {
  // ---- FORM ----
  const [editId, setEditId] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---- DATOS ----
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);

  // ---- PANEL SPLIT (categorías + productos) ----
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [activeCategoria, setActiveCategoria, clearCategoria] = useSessionState("productos_cat", null);
  const [activeCategoriaName, setActiveCategoriaName, clearCategoriaName] = useSessionState("productos_catName", "");
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [productosPorCategoria, setProductosPorCategoria] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // ---- BÚSQUEDA POR CÓDIGO ----
  const [showCodigoPanel, setShowCodigoPanel] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);

  // ---- CONFIRM DELETE ----
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null });

  // ---- IMAGEN AMPLIADA ----
  const [verImagen, setVerImagen] = useState(null);

  // ---- REFS CÁMARA ----
  const inputArchivoRef = useRef(null);
  const inputCamaraRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre: "",
      descripcion: "",
      precio_venta: "",
      precio_alquiler: "",
      stock: "1",
      categoria_id: "",
      color: "",
      talla: "",
      modelo: "",
    },
  });
  const { clearFormPersist } = useFormPersist("productos_rhf", { watch, setValue });

  useEffect(() => {
    fetchCategorias();
  }, []);

  // Voice listener — el MCP despacha "voice:fill-product-form" (fill_product_form → replace _ → -)
  useEffect(() => {
    const handleVoiceFill = async (e) => {
      const data = e.detail;
      if (!data) return;
      const campos = ["nombre", "descripcion", "precio_venta", "precio_alquiler", "stock", "color", "talla", "modelo"];
      for (const key of campos) {
        if (data[key] !== undefined && data[key] !== "") {
          setValue(key, String(data[key]));
          const el = document.querySelector(`[name="${key}"]`);
          if (el) {
            el.classList.add("voice-filling");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          await new Promise((r) => setTimeout(r, 250));
          if (el) el.classList.remove("voice-filling");
        }
      }
    };
    window.addEventListener("voice:fill-product-form", handleVoiceFill);
    return () => window.removeEventListener("voice:fill-product-form", handleVoiceFill);
  }, [setValue]);

  // ---- FETCH ----
  const fetchCategorias = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/categorias`);
      const json = await res.json();
      setCategorias(json.categorias || json || []);
    } catch {
      setCategorias([]);
    }
  };

  // Buscar nombre de categoría por ID en el árbol
  const buscarNombreCategoria = (catId, cats = categorias) => {
    for (const cat of cats) {
      const id = cat.ID || cat.id;
      if (id === catId) return cat.Nombre || cat.nombre || "Sin nombre";
      const sub = cat.SubCategorias || cat.subcategorias || [];
      if (sub.length > 0) {
        const found = buscarNombreCategoria(catId, sub);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSeleccionarCategoria = async (catId, catName) => {
    setActiveCategoria(catId);
    setActiveCategoriaName(catName);
    setValue("categoria_id", catId);
    setShowCategoryPanel(false); // cerrar panel automáticamente
    setLoadingProductos(true);
    try {
      const res = await fetchAuth(`${API_BASE_URL}/categorias/${catId}/productos`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProductosPorCategoria(data.productos || data || []);
    } catch {
      toast.error("Error cargando productos de la categoría");
      setProductosPorCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const limpiarCategoria = () => {
    setActiveCategoria(null);
    setActiveCategoriaName("");
    setProductosPorCategoria([]);
    setValue("categoria_id", "");
  };

  // ---- ÁRBOL DE CATEGORÍAS ----
  const toggleCategoria = (id) =>
    setCategoriasExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderCategoriasList = (cats = [], nivel = 0) =>
    cats.map((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre || "Sin nombre";
      const sub = cat.SubCategorias || cat.subcategorias || [];
      const tieneHijos = sub.length > 0;
      const estaExpandida = categoriasExpandidas[id] ?? false;
      const estaSeleccionada = activeCategoria === id;

      return (
        <div key={id} className="mb-0.5" style={{ marginLeft: nivel * 10 }}>
          <div
            onClick={() => tieneHijos ? toggleCategoria(id) : handleSeleccionarCategoria(id, nombre)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ${
              estaSeleccionada
                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                : tieneHijos
                  ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  : "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {nivel > 0 && (
                <span className={`text-xs flex-shrink-0 ${estaSeleccionada ? "text-white/70" : "text-gray-400"}`}>↳</span>
              )}
              {tieneHijos && (
                <span className="flex-shrink-0 p-0.5">
                  {estaExpandida
                    ? <ChevronDown size={11} className="text-blue-600" />
                    : <ChevronRight size={11} className="text-blue-600" />}
                </span>
              )}
              <span className={`text-xs font-medium truncate ${estaSeleccionada ? "text-white" : tieneHijos ? "text-gray-600" : "text-gray-700"}`}>{nombre}</span>
            </div>
            {tieneHijos && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium text-blue-600 bg-blue-100">{sub.length}</span>
            )}
          </div>
          {tieneHijos && estaExpandida && (
            <div className="mt-0.5">{renderCategoriasList(sub, nivel + 1)}</div>
          )}
        </div>
      );
    });

  // ---- IMAGEN ----
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.warning("La imagen no debe superar los 5MB"); return; }
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  // ---- GUARDAR ----
  const onSubmit = async (data) => {
    if (!data.categoria_id) {
      toast.error("Selecciona una categoría en el panel de la derecha");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("nombre", data.nombre);
      fd.append("descripcion", data.descripcion || "");
      fd.append("precio_venta", data.precio_venta);
      fd.append("precio_alquiler", data.precio_alquiler || "0");
      fd.append("stock", data.stock || "1");
      fd.append("categoria_id", data.categoria_id);
      fd.append("color", data.color || "");
      fd.append("talla", data.talla || "");
      fd.append("modelo", data.modelo || "");
      if (selectedFile) {
        const compressed = await comprimirImagen(selectedFile);
        fd.append("imagen", compressed);
      }
      const url = editId ? `${API_BASE_URL}/productos/${editId}` : `${API_BASE_URL}/productos`;
      const method = editId ? "PUT" : "POST";
      const response = await fetchAuth(url, { method, body: fd });
      if (response.ok) {
        toast.success(editId ? "Producto actualizado" : "Producto creado");
        resetForm();
        if (activeCategoria) handleSeleccionarCategoria(activeCategoria, activeCategoriaName);
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al guardar");
      }
    } catch {
      toast.error("Error guardando producto");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    reset({ nombre: "", descripcion: "", precio_venta: "", precio_alquiler: "", stock: "1", categoria_id: activeCategoria ? String(activeCategoria) : "", color: "", talla: "", modelo: "" });
    setEditId(null);
    setPreviewImage("");
    setSelectedFile(null);
    clearFormPersist();
  };

  const handleEdit = (prod) => {
    setValue("nombre", prod.nombre || "");
    setValue("descripcion", prod.descripcion || "");
    setValue("precio_venta", prod.precio_venta || "");
    setValue("precio_alquiler", prod.precio_alquiler || "0");
    setValue("stock", prod.stock || "1");
    setValue("categoria_id", String(prod.categoria_id || prod.CategoriaID || ""));
    setValue("color", prod.color || "");
    setValue("talla", prod.talla || "");
    setValue("modelo", prod.modelo || "");
    if (prod.imagen) setPreviewImage(buildImageUrl(prod.imagen));
    setEditId(prod.ID || prod.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    try {
      const res = await fetchAuth(`${API_BASE_URL}/productos/${confirmModal.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Producto eliminado");
        setConfirmModal({ show: false, id: null });
        if (activeCategoria) handleSeleccionarCategoria(activeCategoria, activeCategoriaName);
      } else {
        const result = await res.json();
        toast.error(result.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error eliminando producto");
    }
  };

  // ---- BÚSQUEDA POR CÓDIGO ----
  const buscarPorCodigo = async (codigo) => {
    if (!codigo?.trim()) { toast.warning("Ingresa un código"); return; }
    setBuscandoCodigo(true);
    try {
      const res = await fetchAuth(`${API_BASE_URL}/productos/codigo/${codigo.trim()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const prod = data.producto || data;
      if (!prod?.ID && !prod?.id) throw new Error();
      handleEdit(prod);
      setShowCodigoPanel(false);
      setCodigoInput("");
      toast.success(`Producto: ${prod.nombre}`);
      const catId = prod.categoria_id || prod.CategoriaID;
      if (catId) {
        const catName = prod.nombre_categoria || buscarNombreCategoria(catId) || String(catId);
        handleSeleccionarCategoria(catId, catName);
      }
      // Scroll hasta el producto en la tabla después de que se renderice
      const prodId = prod.ID || prod.id;
      setTimeout(() => {
        const row = document.getElementById(`producto-row-${prodId}`);
        if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    } catch {
      toast.error("Producto no encontrado");
    } finally {
      setBuscandoCodigo(false);
    }
  };

  // ---- IMPRIMIR ETIQUETA con JsBarcode (Code128, 38mm, centrado) ----
  const imprimirEtiqueta = (producto) => {
    if (!producto.codigo_de_barras) { toast.warning("Este producto no tiene código de barras"); return; }
    const codigoStr = String(producto.codigo_de_barras).trim();

    // Generar SVG con JsBarcode en el DOM actual (invisible)
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svgEl, codigoStr, {
        format: "CODE128",
        width: 2,
        height: 150,
        displayValue: false,
        margin: 6,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (e) {
      toast.error("No se pudo generar el código de barras");
      return;
    }

    // Forzar atributos de tamaño para que quede a 36mm centrado
    svgEl.setAttribute("style", "display:block;width:36mm;height:36mm;margin:0 auto;");
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");
    const svgString = svgEl.outerHTML;

    const ventana = window.open("", "_blank", "width=300,height=500");
    if (!ventana) return;

    ventana.document.write(`<!DOCTYPE html>
<html><head><title>Etiqueta</title>
<style>
  @page { size: 38mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; color: #000 !important; }
  html, body { width: 100%; }
  body { display: flex; justify-content: center; }
  .etiqueta { width: 38mm; padding: 1.5mm 0; text-align: center; }
  .nombre { font-size: 6.5pt; font-family: Arial, sans-serif; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 auto 1.5mm; max-width: 36mm; }
  .barcode { text-align: center; }
  .codigo { font-size: 7pt; font-family: 'Courier New', monospace; text-align: center; margin-top: 1mm; letter-spacing: 0.5px; font-weight: bold; }
</style>
</head><body>
<div class="etiqueta">
  <div class="nombre">${[producto.nombre, producto.color, producto.talla].filter(Boolean).join(" | ")}</div>
  <div class="barcode">${svgString}</div>
  <div class="codigo">${codigoStr}</div>
</div>
</body></html>`);
    ventana.document.close();
    setTimeout(() => { ventana.print(); ventana.close(); }, 350);
  };

  // Lista que muestra la tabla — solo muestra productos cuando hay categoría seleccionada
  const listaTabla = activeCategoria ? productosPorCategoria : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Package className="w-6 h-6 text-blue-600" />
          Gestión de Productos
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* ===== PANEL IZQUIERDO: FORMULARIO ===== */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">

          {/* Header azul */}
          <div className="bg-blue-400 p-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              {editId ? "EDITAR PRODUCTO" : "CREAR PRODUCTO"}
            </h2>
            <VoiceMicButton
              accion="crear_producto"
              categoriaId={activeCategoria || undefined}
              tieneImagen={!!previewImage}
              getFormContext={() => ({
                campos: getValues(),
                editando: !!editId,
                tieneCategoria: !!activeCategoria,
                categoriaNombre: activeCategoriaName || "",
                tieneImagen: !!previewImage,
                camposFaltantes: !activeCategoria ? ["categoría"] : [],
              })}
            />
          </div>

          {/* Indicador de categoría */}
          {activeCategoria ? (
            <div className="px-3 py-1.5 bg-orange-50 border-b-2 border-orange-400 flex items-center gap-1.5">
              <Package className="w-3 h-3 text-orange-500 flex-shrink-0" />
              <span className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide flex-shrink-0">Categoría:</span>
              <span className="text-xs text-orange-800 font-bold truncate">{activeCategoriaName}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-orange-50 border-b-2 border-orange-300 border-dashed flex items-center gap-1.5">
              <Package className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <span className="text-[10px] text-orange-500 italic">Selecciona una categoría en el panel derecho</span>
            </div>
          )}

          {/* Formulario */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-3 bg-sky-50 space-y-2.5 max-h-[calc(100vh-180px)] overflow-y-auto"
          >
            {/* Campo oculto categoria_id */}
            <input type="hidden" {...register("categoria_id")} />

            {/* FILA 1: Imagen izquierda + campos derecha */}
            <div className="flex gap-2.5 items-start">

              {/* Imagen con botones superpuestos */}
              <div className="flex-shrink-0">
                <div
                  className="relative w-[96px] h-[96px] rounded border-2 border-dashed border-gray-300 overflow-hidden bg-white cursor-pointer"
                  onClick={() => previewImage && setVerImagen(previewImage)}
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {/* Botones sobre la imagen (parte inferior) */}
                  <div className="absolute bottom-0 inset-x-0 flex justify-center gap-2 py-1 bg-black/40">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); inputArchivoRef.current?.click(); }}
                      className="text-white hover:text-blue-200 transition-colors"
                      title="Seleccionar archivo"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <label
                      className="text-white hover:text-green-200 transition-colors cursor-pointer"
                      title="Tomar foto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={inputCamaraRef}
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {previewImage && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewImage(""); setSelectedFile(null); }}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <input type="file" accept="image/*" ref={inputArchivoRef} onChange={handleImageChange} className="hidden" />
              </div>

              {/* Campos derecha de la imagen */}
              <div className="flex-1 space-y-2 min-w-0">
                {/* Nombre */}
                <div className="relative">
                  <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Vestido azul"
                    {...register("nombre", { required: "El nombre es requerido" })}
                    className={`w-full border rounded px-2 py-1.5 text-xs text-gray-900 ${errors.nombre ? "border-red-500" : "border-gray-300"}`}
                  />
                  {errors.nombre && <span className="text-red-500 text-[10px]">{errors.nombre.message}</span>}
                </div>

                {/* P. Venta + P. Alquiler */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                      P. Venta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      {...register("precio_venta", { required: "Requerido" })}
                      className={`w-full border rounded px-2 py-1.5 text-xs text-gray-900 ${errors.precio_venta ? "border-red-500" : "border-gray-300"}`}
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                      P. Alquiler <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      {...register("precio_alquiler")}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                </div>

                {/* Stock + Talla */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="relative">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                      Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" min="0" placeholder="0"
                      {...register("stock", { required: "Requerido" })}
                      className={`w-full border rounded px-2 py-1.5 text-xs text-gray-900 ${errors.stock ? "border-red-500" : "border-gray-300"}`}
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                      Talla <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" placeholder="M, L..."
                      {...register("talla")}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color + Modelo */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                  Color <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" placeholder="Azul, Rojo..."
                  {...register("color")}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900"
                />
              </div>
              <div className="relative">
                <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" placeholder="Deportivo..."
                  {...register("modelo")}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="relative">
              <label className="absolute -top-2 left-2 bg-sky-50 px-1 text-[10px] font-medium text-gray-700 z-10 whitespace-nowrap">
                Descripción <span className="text-gray-400 text-[9px]">(opcional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Características adicionales del producto..."
                {...register("descripcion")}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 resize-none"
              />
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="btn-guardar-producto"
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded text-xs disabled:opacity-50"
              >
                {saving
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar Producto"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpiar Formulario
              </button>
            </div>
          </form>
        </div>

        {/* ===== PANEL DERECHO ===== */}
        <div className="md:col-span-3 bg-white rounded-lg shadow-md overflow-hidden">

          {/* Header derecha */}
          <div className="bg-blue-300 p-2.5 flex flex-wrap items-center gap-2">
            {/* Botones de navegación lado a lado */}
            <button
              onClick={() => setShowCategoryPanel(!showCategoryPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border-2 border-orange-400 transition-all ${
                showCategoryPanel
                  ? "bg-white/40 text-blue-950 border-orange-500"
                  : "bg-white/20 text-blue-900 hover:bg-white/40 hover:border-orange-500 hover:text-blue-950"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              {activeCategoria ? "Cambiar categoría" : "Seleccionar categoría"}
            </button>

            <button
              onClick={() => { setShowCodigoPanel(!showCodigoPanel); setCodigoInput(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border-2 border-orange-400 transition-all ${
                showCodigoPanel
                  ? "bg-white/40 text-blue-950 border-orange-500"
                  : "bg-white/20 text-blue-900 hover:bg-white/40 hover:border-orange-500 hover:text-blue-950"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Buscar por código
            </button>

            <div className="flex-1" />

            {/* Título de la tabla */}
            <h2 className="text-base font-bold text-blue-900 tracking-wide">
              Productos
            </h2>
          </div>

          {/* Panel scan de código */}
          {showCodigoPanel && (
            <div className="border-b border-gray-200 bg-green-50 px-4 py-2.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-green-600 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && codigoInput.trim()) buscarPorCodigo(codigoInput); }}
                placeholder="Escanea o escribe el código de barras..."
                className="flex-1 text-sm border border-green-300 rounded px-2.5 py-1 focus:ring-2 focus:ring-green-400 outline-none"
              />
              <button
                onClick={() => buscarPorCodigo(codigoInput)}
                disabled={buscandoCodigo || !codigoInput.trim()}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50"
              >
                {buscandoCodigo ? "..." : "Buscar"}
              </button>
              <button onClick={() => { setShowCodigoPanel(false); setCodigoInput(""); }} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ============ MODO SPLIT: Categorías + Productos ============ */}
          {showCategoryPanel ? (
            <div className="flex" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
              {/* Lado izquierdo: árbol de categorías */}
              <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-3 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Categorías</p>
                </div>
                {categorias.length === 0
                  ? <p className="text-xs text-gray-400">Cargando...</p>
                  : renderCategoriasList(categorias)}
              </div>

              {/* Lado derecho: productos de la categoría */}
              <div className="flex-1 overflow-y-auto">
                {!activeCategoria ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center">
                    <div>
                      <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      Selecciona una categoría para ver sus productos
                    </div>
                  </div>
                ) : loadingProductos ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : productosPorCategoria.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No hay productos en esta categoría
                  </div>
                ) : (
                  <div key={activeCategoria} className="p-2 space-y-1 categoria-productos-enter">
                    <p className="text-[10px] text-blue-600 font-medium px-1 pb-1 flex items-center justify-between">
                      <span>{productosPorCategoria.length} productos en <strong>{activeCategoriaName}</strong></span>
                      <button onClick={limpiarCategoria} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5">
                        <X className="w-3 h-3" /> Limpiar
                      </button>
                    </p>
                    {productosPorCategoria.map((prod) => {
                      const pid = prod.ID || prod.id;
                      return (
                        <div
                          key={pid}
                          className={`flex items-center gap-2 p-2 border rounded transition-colors cursor-pointer ${editId === pid ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400" : "bg-sky-50 hover:bg-sky-100 border-gray-200"}`}
                          onClick={() => { handleEdit(prod); setShowCategoryPanel(false); }}
                        >
                          {prod.imagen ? (
                            <img src={buildImageUrl(prod.imagen)} alt={prod.nombre} className="w-9 h-9 object-cover rounded border border-blue-300 flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 bg-blue-100 rounded border border-blue-200 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[11px] text-gray-800 truncate">{prod.nombre}</p>
                            <p className="text-[10px] text-gray-500">
                              {[prod.modelo && `M:${prod.modelo}`, prod.color, prod.talla && `T:${prod.talla}`].filter(Boolean).join(" ")}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-[10px] font-semibold text-green-600">S/ {Number(prod.precio_venta || 0).toFixed(2)}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${prod.stock > 5 ? "bg-green-100 text-green-700" : prod.stock > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {prod.stock || 0}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); imprimirEtiqueta(prod); }}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Imprimir"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmModal({ show: true, id: pid }); }}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============ MODO TABLA NORMAL ============ */
            <>
              {activeCategoria && (
                <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <p className="text-xs text-blue-700 font-medium">
                    {listaTabla.length} producto{listaTabla.length !== 1 ? "s" : ""} en <strong>{activeCategoriaName}</strong>
                  </p>
                  <button onClick={limpiarCategoria} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5">
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                </div>
              )}
              <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-400 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wide">Producto</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wide">Código Barras</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wide">P. Venta</th>
                      <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wide">P. Alquiler</th>
                      <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wide">Stock</th>
                      <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody key={activeCategoria || "all"} className={`divide-y divide-gray-100 ${activeCategoria ? "categoria-productos-enter" : ""}`}>
                    {listaTabla.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-10 text-center text-gray-400 text-xs">
                          {activeCategoria
                            ? "No hay productos en esta categoría"
                            : "Selecciona una categoría para ver sus productos"}
                        </td>
                      </tr>
                    ) : (
                      listaTabla.map((prod) => {
                        const pid = prod.ID || prod.id;
                        const codigoBarras = prod.codigo_de_barras || "—";
                        return (
                          <tr key={pid} id={`producto-row-${pid}`} className={`transition-colors ${editId === pid ? "bg-amber-50 ring-2 ring-amber-400 ring-inset" : "hover:bg-gray-50"}`}>

                            {/* Producto */}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-2">
                                {prod.imagen ? (
                                  <img
                                    src={buildImageUrl(prod.imagen)}
                                    alt={prod.nombre}
                                    onClick={() => setVerImagen(buildImageUrl(prod.imagen))}
                                    className="w-10 h-10 object-cover rounded border-2 border-blue-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-blue-50 rounded border-2 border-blue-200 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-blue-400" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-[11px] text-gray-800 leading-tight">{prod.nombre}</p>
                                  <p className="text-[10px] text-gray-500 leading-tight">
                                    {[prod.modelo && `M:${prod.modelo}`, prod.color, prod.talla && `T:${prod.talla}`].filter(Boolean).join(" ")}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Código de barras */}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-green-700">{codigoBarras}</span>
                                <button
                                  onClick={() => imprimirEtiqueta(prod)}
                                  className="p-0.5 text-gray-400 hover:text-green-600 transition-colors flex-shrink-0"
                                  title="Imprimir etiqueta"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Precio venta */}
                            <td className="px-2 py-2">
                              <span className="text-[11px] font-semibold text-green-600">
                                S/ {Number(prod.precio_venta || 0).toFixed(2)}
                              </span>
                            </td>

                            {/* Precio alquiler */}
                            <td className="px-2 py-2">
                              <span className="text-[11px] text-gray-600">
                                S/ {Number(prod.precio_alquiler || 0).toFixed(2)}
                              </span>
                            </td>

                            {/* Stock */}
                            <td className="px-2 py-2 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                                prod.stock > 5 ? "bg-green-100 text-green-700"
                                  : prod.stock > 0 ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {prod.stock || 0}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEdit(prod)}
                                  className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded"
                                  title="Editar"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmModal({ show: true, id: pid })}
                                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3 h-3" />
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
            </>
          )}
        </div>
      </div>

      {/* Modal confirmar eliminación */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="bg-red-600 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold">Eliminar Producto</h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700 text-sm mb-5">¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm">
                  Eliminar
                </button>
                <button onClick={() => setConfirmModal({ show: false, id: null })} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imagen ampliada */}
      {verImagen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setVerImagen(null)}>
          <div className="relative max-w-3xl max-h-[90vh]">
            <button onClick={() => setVerImagen(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <img src={verImagen} alt="Vista ampliada" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      <style>{`
        .voice-filling {
          outline: 2px solid #3b82f6 !important;
          background-color: #eff6ff !important;
          transition: all 0.2s ease;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .categoria-productos-enter tr,
        .categoria-productos-enter > div {
          animation: slideIn 0.3s ease forwards;
        }
        .categoria-productos-enter tr:nth-child(1) { animation-delay: 0ms; }
        .categoria-productos-enter tr:nth-child(2) { animation-delay: 40ms; }
        .categoria-productos-enter tr:nth-child(3) { animation-delay: 80ms; }
        .categoria-productos-enter tr:nth-child(4) { animation-delay: 120ms; }
        .categoria-productos-enter tr:nth-child(5) { animation-delay: 160ms; }
        .categoria-productos-enter tr:nth-child(6) { animation-delay: 200ms; }
        .categoria-productos-enter tr:nth-child(7) { animation-delay: 240ms; }
        .categoria-productos-enter tr:nth-child(8) { animation-delay: 280ms; }
        .categoria-productos-enter > div:nth-child(1) { animation-delay: 0ms; }
        .categoria-productos-enter > div:nth-child(2) { animation-delay: 40ms; }
        .categoria-productos-enter > div:nth-child(3) { animation-delay: 40ms; }
        .categoria-productos-enter > div:nth-child(4) { animation-delay: 80ms; }
        .categoria-productos-enter > div:nth-child(5) { animation-delay: 120ms; }
        .categoria-productos-enter > div:nth-child(6) { animation-delay: 160ms; }
        .categoria-productos-enter > div:nth-child(7) { animation-delay: 200ms; }
        .categoria-productos-enter > div:nth-child(8) { animation-delay: 240ms; }
      `}</style>
    </div>
  );
}
