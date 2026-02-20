import { useState, useEffect } from "react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  Settings,
  Building,
  Mail,
  Phone,
  MapPin,
  Save,
  Upload,
  X,
  Globe,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { buildImageUrl } from "../funciones/imageUtils";
import { comprimirImagen } from "../funciones/funciones";

export default function Configuracion() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [previewLogo, setPreviewLogo] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    nombre_empresa: "",
    lema: "",
    direccion: "",
    telefono: "",
    email: "",
    ruc: "",
    website: "",
  });

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE_URL}/configuracion`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setFormData({
          nombre_empresa: data.nombre_empresa || "",
          lema: data.lema || "",
          direccion: data.direccion || "",
          telefono: data.telefono || "",
          email: data.email || "",
          ruc: data.ruc || "",
          website: data.website || "",
        });
        if (data.logo) {
          setPreviewLogo(buildImageUrl(data.logo));
        }
      }
    } catch (err) {
      toast.error("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("La imagen no debe superar los 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setPreviewLogo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("nombre_empresa", formData.nombre_empresa);
      formDataToSend.append("lema", formData.lema);
      formDataToSend.append("direccion", formData.direccion);
      formDataToSend.append("telefono", formData.telefono);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("ruc", formData.ruc);
      formDataToSend.append("website", formData.website);

      if (selectedFile) {
        const compressedImage = await comprimirImagen(selectedFile);
        formDataToSend.append("logo", compressedImage);
      }

      const response = await fetchAuth(`${API_BASE_URL}/configuracion`, {
        method: "PUT",
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success("Configuración actualizada correctamente");
        fetchConfiguracion();
        setSelectedFile(null);
        window.location.reload();
      } else {
        const result = await response.json();
        toast.error(result.message || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error guardando configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-800">Configuración del Sistema</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-600" />
            Información de la Empresa
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de la Empresa
                </label>
                {previewLogo ? (
                  <div className="relative inline-block">
                    <img
                      src={previewLogo}
                      alt="Logo"
                      className="w-32 h-32 object-contain rounded-lg border-2 border-gray-300 bg-white p-2"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Subir Logo
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
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  name="nombre_empresa"
                  value={formData.nombre_empresa}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Mi Empresa S.A.C."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lema/Slogan
                </label>
                <input
                  type="text"
                  name="lema"
                  value={formData.lema}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Calidad y confianza"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Dirección completa de la empresa"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: +51 987 654 321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  RUC
                </label>
                <input
                  type="text"
                  name="ruc"
                  value={formData.ruc}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: 20123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  Sitio Web
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              fetchConfiguracion();
              setSelectedFile(null);
            }}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los cambios se aplicarán inmediatamente en todo el sistema</li>
              <li>El logo aparecerá en el menú lateral y en reportes</li>
              <li>Recomendado: Logo en formato PNG con fondo transparente</li>
              <li>Tamaño máximo de imagen: 5 MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
