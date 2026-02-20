import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Upload,
  Printer,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { buildImageUrl } from "../funciones/imageUtils";
import { comprimirImagen } from "../funciones/funciones";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [verImagen, setVerImagen] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE_URL}/productos`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data || []);
      }
    } catch (err) {
      toast.error("Error cargando productos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/categorias`);
      const json = await res.json();
      const data = json.categorias || json || [];
      setCategorias(flattenCategorias(data));
    } catch (err) {
      setCategorias([]);
    }
  };

  const flattenCategorias = (cats, prefix = "") => {
    let result = [];
    for (const cat of cats) {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre;
      result.push({ id, nombre: prefix + nombre });
      const subCats = cat.SubCategorias || cat.subcategorias || [];
      if (subCats.length > 0) {
        result = result.concat(flattenCategorias(subCats, prefix + "-- "));
      }
    }
    return result;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("La imagen no debe superar los 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("nombre", data.nombre);
      formDataToSend.append("descripcion", data.descripcion || "");
      formDataToSend.append("precio_venta", data.precio_venta);
      formDataToSend.append("precio_alquiler", data.precio_alquiler || "0");
      formDataToSend.append("stock", data.stock || "1");
      formDataToSend.append("categoria_id", data.categoria_id);
      formDataToSend.append("color", data.color || "");
      formDataToSend.append("talla", data.talla || "");
      formDataToSend.append("modelo", data.modelo || "");

      if (selectedFile) {
        const compressed = await comprimirImagen(selectedFile);
        formDataToSend.append("imagen", compressed);
      }

      const url = editId
        ? `${API_BASE_URL}/productos/${editId}`
        : `${API_BASE_URL}/productos`;
      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method,
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success(editId ? "Producto actualizado" : "Producto creado");
        resetForm();
        fetchProductos();
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error guardando producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetchAuth(
        `${API_BASE_URL}/productos/${confirmDelete}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Producto eliminado");
        fetchProductos();
        setConfirmDelete(null);
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al eliminar");
      }
    } catch (err) {
      toast.error("Error eliminando producto");
    }
  };

  const handleEdit = (prod) => {
    setValue("nombre", prod.nombre || "");
    setValue("descripcion", prod.descripcion || "");
    setValue("precio_venta", prod.precio_venta || "");
    setValue("precio_alquiler", prod.precio_alquiler || "0");
    setValue("stock", prod.stock || "1");
    setValue("categoria_id", prod.categoria_id || prod.CategoriaID || "");
    setValue("color", prod.color || "");
    setValue("talla", prod.talla || "");
    setValue("modelo", prod.modelo || "");

    if (prod.imagen) {
      setPreviewImage(buildImageUrl(prod.imagen));
    }

    setEditId(prod.ID || prod.id);
    setShowModal(true);
  };

  const resetForm = () => {
    reset();
    setEditId(null);
    setShowModal(false);
    setPreviewImage("");
    setSelectedFile(null);
  };

  const imprimirEtiqueta = (producto) => {
    const codigo = `P${String(producto.ID || producto.id).padStart(6, "0")}`;
    const ventana = window.open("", "_blank", "width=400,height=600");

    const generateCode128 = (text) => {
      const CODE128 = {
        " ": "212222",
        "!": "222122",
        '"': "222221",
        "#": "121223",
        $: "121322",
        "%": "131222",
        "&": "122213",
        "'": "122312",
        "(": "132212",
        ")": "221213",
        "*": "221312",
        "+": "231212",
        ",": "112232",
        "-": "122132",
        ".": "122231",
        "/": "113222",
        0: "123122",
        1: "123221",
        2: "223211",
        3: "221132",
        4: "221231",
        5: "213212",
        6: "223112",
        7: "312131",
        8: "311222",
        9: "321122",
        ":": "321221",
        ";": "312212",
        "<": "322112",
        "=": "322211",
        ">": "212123",
        "?": "212321",
        "@": "232121",
        A: "111323",
        B: "131123",
        C: "131321",
        D: "112313",
        E: "132113",
        F: "132311",
        G: "211313",
        H: "231113",
        I: "231311",
        J: "112133",
        K: "112331",
        L: "132131",
        M: "113123",
        N: "113321",
        O: "133121",
        P: "313121",
        Q: "211331",
        R: "231131",
        S: "213113",
        T: "213311",
        U: "213131",
        V: "311123",
        W: "311321",
        X: "331121",
        Y: "312113",
        Z: "312311",
      };

      const patterns = [];
      patterns.push("211412");

      for (const char of text) {
        patterns.push(CODE128[char] || "212222");
      }

      patterns.push("2331112");

      const modules = [];
      for (const pattern of patterns) {
        for (const digit of pattern) {
          const width = parseInt(digit);
          for (let i = 0; i < width; i++) {
            modules.push(modules.length % 2 === 0 ? 1 : 0);
          }
        }
      }

      return modules;
    };

    const modules = generateCode128(codigo);
    const totalH = modules.length;
    const barW = 70;
    let svgBars = "";
    for (let i = 0; i < totalH; i++) {
      if (modules[i]) {
        svgBars +=
          "<rect x='0' y='" +
          i +
          "' width='" +
          barW +
          "' height='1' fill='#000'/>";
      }
    }
    const svgCode =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " +
      barW +
      " " +
      totalH +
      "' preserveAspectRatio='xMidYMid meet' style='width:100%;height:100%;display:block'>" +
      svgBars +
      "</svg>";

    ventana.document.write(
      "<!DOCTYPE html>" +
        "<html><head><title>Etiqueta</title>" +
        "<style>" +
        "@page { size: 40mm auto; margin: 0; }" +
        "* { margin: 0; padding: 0; box-sizing: border-box; color: #000 !important; }" +
        "html, body { width: 40mm; margin: 0 auto; overflow: hidden; }" +
        "body { font-family: Calibri; display: flex; align-items: center; justify-content: center; }" +
        ".etiqueta { width: 40mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3mm 1mm; }" +
        ".nombre { font-size: 8pt; text-align: center; font-weight: bold; margin-bottom: 2mm; max-width: 38mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }" +
        ".barcode { width: 38mm; height: 20mm; display: flex; align-items: center; justify-content: center; }" +
        ".barcode svg { width: 38mm; height: 20mm; }" +
        ".codigo { font-size: 8pt; text-align: center; margin-top: 2mm; letter-spacing: 1.5px; font-weight: bold; }" +
        "</style>" +
        "</head><body>" +
        '<div class="etiqueta">' +
        '<div class="nombre">' +
        producto.nombre +
        "</div>" +
        '<div class="barcode">' +
        svgCode +
        "</div>" +
        '<div class="codigo">' +
        codigo +
        "</div>" +
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
    const matchesSearch = nombre.includes(searchLower) || descripcion.includes(searchLower);
    const matchesCategoria =
      !categoriaFilter ||
      String(prod.categoria_id || prod.CategoriaID) === categoriaFilter;
    return matchesSearch && matchesCategoria;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Productos</h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Precios</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Detalles</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProductos.map((prod) => (
                  <tr key={prod.ID || prod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {prod.imagen ? (
                          <img
                            src={buildImageUrl(prod.imagen)}
                            alt={prod.nombre}
                            className="w-12 h-12 object-cover rounded border-2 border-orange-500 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => setVerImagen(buildImageUrl(prod.imagen))}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-orange-600" />
                          </div>
                        )}
                        <p className="font-medium text-gray-800">{prod.nombre}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {prod.descripcion || "Sin descripción"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-600">
                          Venta: S/ {prod.precio_venta}
                        </p>
                        <p className="text-sm text-gray-600">
                          Alquiler: S/ {prod.precio_alquiler || "0"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prod.stock > 5
                            ? "bg-green-100 text-green-700"
                            : prod.stock > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {prod.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs text-gray-600">
                        {prod.talla && <p>Talla: {prod.talla}</p>}
                        {prod.color && <p>Color: {prod.color}</p>}
                        {prod.modelo && <p>Modelo: {prod.modelo}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => imprimirEtiqueta(prod)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="Imprimir etiqueta"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(prod)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(prod.ID || prod.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6" />
                <h2 className="text-xl font-bold">
                  {editId ? "Editar Producto" : "Nuevo Producto"}
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
              <div className="flex flex-col items-center gap-4 pb-4 border-b">
                {previewImage ? (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage("");
                        setSelectedFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Subir Imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    {...register("nombre", { required: "El nombre es requerido" })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                      errors.nombre ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    {...register("categoria_id", { required: "Seleccione una categoría" })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                      errors.categoria_id ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.categoria_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.categoria_id.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  {...register("descripcion")}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Venta *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("precio_venta", {
                      required: "El precio de venta es requerido",
                      min: { value: 0, message: "Debe ser mayor o igual a 0" },
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                      errors.precio_venta ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.precio_venta && (
                    <p className="text-red-500 text-xs mt-1">{errors.precio_venta.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Alquiler
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("precio_alquiler")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    {...register("stock", {
                      required: "El stock es requerido",
                      min: { value: 0, message: "Debe ser mayor o igual a 0" },
                    })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                      errors.stock ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.stock && (
                    <p className="text-red-500 text-xs mt-1">{errors.stock.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talla</label>
                  <input
                    type="text"
                    {...register("talla")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: M, XL, 42"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    {...register("color")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Azul, Rojo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    {...register("modelo")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: Clásico, Moderno"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editId ? "Actualizar" : "Crear Producto"}
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

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.
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

      {verImagen && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setVerImagen(null)}
        >
          <img
            src={verImagen}
            alt="Vista ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
