import { useState, useEffect } from "react";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  Settings,
  Upload,
  X,
  Save,
  Eraser,
  Globe,
  Mail,
  FileText,
  Building2,
  Image,
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
    razon_social: "",
    ruc: "",
    correo: "",
    sitio_web: "",
    lema: "",
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
          razon_social: data.razon_social || "",
          ruc: data.ruc || "",
          correo: data.correo || "",
          sitio_web: data.sitio_web || "",
          lema: data.lema || "",
        });
        if (data.logo) {
          setPreviewLogo(buildImageUrl(data.logo));
        }
      } else {
        setConfig(null);
      }
    } catch {
      setConfig(null);
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

  const limpiarFormulario = () => {
    setFormData({
      nombre_empresa: "",
      razon_social: "",
      ruc: "",
      correo: "",
      sitio_web: "",
      lema: "",
    });
    setSelectedFile(null);
    setPreviewLogo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_empresa.trim() || !formData.razon_social.trim() || !formData.ruc.trim()) {
      toast.warning("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    try {
      const fd = new FormData();
      fd.append("nombre_empresa", formData.nombre_empresa);
      fd.append("razon_social", formData.razon_social);
      fd.append("ruc", formData.ruc);
      fd.append("correo", formData.correo);
      fd.append("sitio_web", formData.sitio_web);
      fd.append("lema", formData.lema);

      if (selectedFile) {
        const compressedImage = await comprimirImagen(selectedFile);
        fd.append("logo", compressedImage);
      }

      const method = config ? "PUT" : "POST";
      const response = await fetchAuth(`${API_BASE_URL}/configuracion`, {
        method,
        body: fd,
      });

      if (response.ok) {
        toast.success(config ? "Configuración actualizada" : "Configuración creada");
        setSelectedFile(null);
        fetchConfiguracion();
      } else {
        const result = await response.json().catch(() => null);
        toast.error(result?.message || "Error al guardar");
      }
    } catch {
      toast.error("Error guardando configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 min-h-screen bg-blue-50">
      {/* ─── HEADER ─── */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-3">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800">
          <Settings className="w-6 h-6 text-blue-600" />
          CONFIGURACIÓN
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* ─── Panel Izquierdo: Formulario (2/5) ─── */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-400 p-2">
            <h2 className="text-sm font-bold text-center text-white">
              {config ? "EDITAR CONFIGURACIÓN" : "NUEVA CONFIGURACIÓN"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-3 space-y-3 bg-sky-50">
            {/* Logo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Logo</label>
              <div className="flex items-center gap-3">
                {previewLogo ? (
                  <div className="relative">
                    <img
                      src={previewLogo}
                      alt="Logo"
                      className="w-20 h-20 object-contain rounded border border-gray-200 bg-white p-1"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-white">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer bg-blue-500 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Cambiar imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Nombre comercial */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nombre comercial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre_empresa"
                value={formData.nombre_empresa}
                onChange={handleInputChange}
                required
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Ej: Aura"
              />
            </div>

            {/* Razón social */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Razón social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                required
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Ej: Aura S.A.C."
              />
            </div>

            {/* RUC */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                RUC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ruc"
                value={formData.ruc}
                onChange={handleInputChange}
                required
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Ej: 20123456789"
              />
            </div>

            {/* Correo */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="contacto@empresa.com"
              />
            </div>

            {/* Sitio web */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sitio web</label>
              <input
                type="url"
                name="sitio_web"
                value={formData.sitio_web}
                onChange={handleInputChange}
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="https://www.empresa.com"
              />
            </div>

            {/* Lema */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lema</label>
              <input
                type="text"
                name="lema"
                value={formData.lema}
                onChange={handleInputChange}
                className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                placeholder="Ej: Calidad y confianza"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-1.5 rounded hover:bg-blue-600 transition-colors font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={limpiarFormulario}
                className="flex-1 bg-gray-300 text-gray-700 py-1.5 rounded hover:bg-gray-400 transition-colors font-bold flex items-center justify-center gap-1.5 text-xs"
              >
                <Eraser className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>
          </form>
        </div>

        {/* ─── Panel Derecho: Info de la Empresa (3/5) ─── */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-md overflow-hidden h-fit">
          <div className="bg-blue-400 p-2">
            <h2 className="text-sm font-bold text-center text-white">
              INFORMACIÓN DE LA EMPRESA
            </h2>
          </div>

          <div className="p-4">
            {config ? (
              <div className="space-y-4">
                {/* Logo */}
                {config.logo && (
                  <div className="flex justify-center pb-4 border-b">
                    <img
                      src={buildImageUrl(config.logo)}
                      alt="Logo empresa"
                      className="w-32 h-32 object-contain rounded-lg border border-gray-200 bg-white p-2"
                    />
                  </div>
                )}

                <InfoRow
                  icon={<Building2 className="w-4 h-4 text-blue-500" />}
                  label="Nombre comercial"
                  value={config.nombre_empresa}
                />
                <InfoRow
                  icon={<FileText className="w-4 h-4 text-blue-500" />}
                  label="Razón social"
                  value={config.razon_social}
                />
                <InfoRow
                  icon={<FileText className="w-4 h-4 text-blue-500" />}
                  label="RUC"
                  value={config.ruc}
                />
                <InfoRow
                  icon={<Mail className="w-4 h-4 text-blue-500" />}
                  label="Correo"
                  value={config.correo}
                />
                <InfoRow
                  icon={<Globe className="w-4 h-4 text-blue-500" />}
                  label="Sitio web"
                  value={config.sitio_web}
                />
                <InfoRow
                  icon={<Settings className="w-4 h-4 text-blue-500" />}
                  label="Lema"
                  value={config.lema}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Settings className="w-16 h-16 mb-4" />
                <p className="text-center text-sm font-medium">
                  No hay configuración registrada.
                </p>
                <p className="text-center text-xs mt-1">
                  Completa el formulario para configurar tu empresa.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-semibold">{value}</p>
      </div>
    </div>
  );
}
