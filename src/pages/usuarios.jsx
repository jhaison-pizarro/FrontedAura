import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { fetchAuth } from "../funciones/auth";
import { API_BASE_URL } from "../config";
import {
  UserPlus,
  Pencil,
  Search,
  Users,
  Mail,
  Phone,
  Shield,
  Bell,
  CheckCircle,
  XCircle,
  DollarSign,
  Camera,
  User,
  X,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "sonner";
import { buildImageUrl } from "../funciones/imageUtils";
import { comprimirImagen } from "../funciones/funciones";
import VoiceMicButton from "../components/VoiceMicButton";

export default function Usuarios() {
  const [empleados, setEmpleados] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modal de aprobación
  const [showModalAprobar, setShowModalAprobar] = useState(false);
  const [empleadoAprobar, setEmpleadoAprobar] = useState(null);
  const [formAprobacion, setFormAprobacion] = useState({
    perfil: "vendedor",
    salario: 0,
    sucursal_id: "",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm();

  const perfil = watch("perfil");
  const passwordNueva = watch("password");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    fetchEmpleados();
    fetchPendientes();
    fetchSucursales();
  }, []);

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE_URL}/empleados`);
      if (res.ok) {
        const data = await res.json();
        setEmpleados(data || []);
      }
    } catch (err) {
      toast.error("Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendientes = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/empleados/pendientes`);
      if (res.ok) {
        const data = await res.json();
        setPendientes(data || []);
      }
    } catch (err) {
      setPendientes([]);
    }
  };

  const fetchSucursales = async () => {
    try {
      const res = await fetchAuth(`${API_BASE_URL}/sucursales`);
      if (res.ok) {
        const data = await res.json();
        setSucursales(data || []);
      }
    } catch (err) {
      setSucursales([]);
    }
  };

  // Consultar RENIEC
  const consultarReniec = async () => {
    const dni = watch("dni");
    if (!dni || dni.length !== 8) {
      toast.warning("Ingrese un DNI válido de 8 dígitos");
      return;
    }

    setBuscandoDni(true);
    try {
      const response = await fetch("https://apiperu.dev/api/dni", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_DNI_API_TOKEN}`,
        },
        body: JSON.stringify({ dni }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setValue("nombre", result.data.nombres);
        setValue("apellidos", `${result.data.apellido_paterno} ${result.data.apellido_materno}`);
        toast.success("Datos obtenidos de RENIEC");
      } else {
        toast.error("No se encontraron datos para este DNI");
      }
    } catch (error) {
      toast.error("Error al consultar RENIEC");
    } finally {
      setBuscandoDni(false);
    }
  };

  // Validación de fortaleza de contraseña
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "bg-gray-400", checks: {} };
    let score = 0;
    const checks = {
      length: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 2) return { score, label: "Débil", color: "bg-red-500", checks };
    if (score <= 3) return { score, label: "Media", color: "bg-yellow-500", checks };
    if (score <= 4) return { score, label: "Buena", color: "bg-blue-500", checks };
    return { score, label: "Fuerte", color: "bg-green-500", checks };
  };

  const passwordStrength = getPasswordStrength(passwordNueva);

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
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("Nombre", data.nombre);
      formDataToSend.append("Apellidos", data.apellidos);
      formDataToSend.append("DNI", data.dni);
      formDataToSend.append("Correo", data.correo);
      formDataToSend.append("Telefono", data.telefono || "");
      formDataToSend.append("Perfil", data.perfil);
      formDataToSend.append("Estado", data.estado || "activo");

      // Solo para vendedores
      if (data.perfil === "vendedor") {
        formDataToSend.append("Salario", parseFloat(data.salario || 0));
        formDataToSend.append("SucursalID", parseInt(data.sucursal_id));
      }

      if (!editId && data.password) {
        formDataToSend.append("Password", data.password);
      }

      if (selectedFile) {
        formDataToSend.append("Imagen", await comprimirImagen(selectedFile));
      }

      const url = editId
        ? `${API_BASE_URL}/empleados/${editId}`
        : `${API_BASE_URL}/empleados`;
      const method = editId ? "PUT" : "POST";

      const response = await fetchAuth(url, {
        method,
        body: formDataToSend,
      });

      if (response.ok) {
        toast.success(editId ? "Usuario actualizado" : "Usuario creado");
        resetForm();
        fetchEmpleados();
        fetchPendientes();
      } else {
        const result = await response.json();
        toast.error(result.error || result.message || "Error al guardar");
      }
    } catch (err) {
      toast.error("Error guardando usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (emp) => {
    setEditId(emp.ID);
    setValue("nombre", emp.Nombre || "");
    setValue("apellidos", emp.Apellidos || "");
    setValue("dni", emp.DNI || "");
    setValue("correo", emp.Correo || "");
    setValue("telefono", emp.Telefono || "");
    setValue("perfil", emp.Perfil || "vendedor");
    setValue("salario", emp.Salario || 0);
    setValue("sucursal_id", emp.SucursalID || "");
    setValue("estado", emp.Estado || "activo");
    setValue("password", "");
    if (emp.Imagen) {
      setPreviewImage(buildImageUrl(emp.Imagen));
    }
    setSelectedFile(null);
  };

  const resetForm = () => {
    reset({
      nombre: "",
      apellidos: "",
      dni: "",
      correo: "",
      telefono: "",
      perfil: "",
      salario: 0,
      password: "",
      confirmPassword: "",
      estado: "activo",
      sucursal_id: "",
    });
    setEditId(null);
    setPreviewImage("");
    setSelectedFile(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const toggleEstado = async (emp) => {
    const nuevoEstado = emp.Estado === "activo" ? "inactivo" : "activo";
    const accion = nuevoEstado === "activo" ? "activar" : "inactivar";

    if (!confirm(`¿Desea ${accion} a ${emp.Nombre} ${emp.Apellidos}?`)) return;

    try {
      const endpoint = nuevoEstado === "activo"
        ? `${API_BASE_URL}/empleados/${emp.ID}/activar`
        : `${API_BASE_URL}/empleados/${emp.ID}/inactivar`;

      const res = await fetchAuth(endpoint, {
        method: "PUT",
      });

      if (res.ok) {
        toast.success(`Usuario ${accion === "activar" ? "activado" : "inactivado"}`);
        fetchEmpleados();
      } else {
        const result = await res.json();
        toast.error(result.error || `Error al ${accion}`);
      }
    } catch (err) {
      toast.error(`Error al ${accion} usuario`);
    }
  };

  const handleAprobarClick = (empleado) => {
    setEmpleadoAprobar(empleado);
    setFormAprobacion({
      perfil: "vendedor",
      salario: 0,
      sucursal_id: empleado.SucursalID || "",
    });
    setShowModalAprobar(true);
  };

  const handleAprobar = async () => {
    if (!empleadoAprobar) return;

    if (!formAprobacion.salario || formAprobacion.salario <= 0) {
      toast.error("El salario debe ser mayor a 0");
      return;
    }

    try {
      const res = await fetchAuth(`${API_BASE_URL}/empleados/${empleadoAprobar.ID}/aprobar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil: formAprobacion.perfil,
          salario: parseFloat(formAprobacion.salario),
          sucursal_id: parseInt(formAprobacion.sucursal_id),
        }),
      });

      if (res.ok) {
        toast.success("Usuario aprobado exitosamente");
        setShowModalAprobar(false);
        setEmpleadoAprobar(null);
        fetchPendientes();
        fetchEmpleados();
      } else {
        const result = await res.json();
        toast.error(result.error || "Error al aprobar");
      }
    } catch (err) {
      toast.error("Error aprobando usuario");
    }
  };

  const handleRechazar = async (empleado) => {
    if (!confirm(`¿Rechazar y eliminar a ${empleado.Nombre} ${empleado.Apellidos}?`)) return;

    try {
      const res = await fetchAuth(`${API_BASE_URL}/empleados/${empleado.ID}/rechazar`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Usuario rechazado");
        fetchPendientes();
      } else {
        const result = await res.json();
        toast.error(result.error || "Error al rechazar");
      }
    } catch (err) {
      toast.error("Error rechazando usuario");
    }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`¿Está seguro de eliminar a ${emp.Nombre} ${emp.Apellidos}?\nEsta acción no se puede deshacer.`)) return;

    try {
      const res = await fetchAuth(`${API_BASE_URL}/empleados/${emp.ID}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Usuario eliminado correctamente");
        fetchEmpleados();
      } else {
        const result = await res.json();
        toast.error(result.error || "Error al eliminar");
      }
    } catch (err) {
      toast.error("Error eliminando usuario");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Users className="w-6 h-6 text-sky-600" />
          Gestión de Usuarios
        </h1>
      </div>

      {/* Banner de usuarios pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-white" />
              <h3 className="text-xl font-bold text-white">
                {pendientes.length} {pendientes.length === 1 ? "Usuario Pendiente" : "Usuarios Pendientes"} de Aprobación
              </h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendientes.map((emp) => (
                <div
                  key={emp.ID}
                  className="bg-white/95 backdrop-blur-sm rounded-lg p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {emp.Imagen ? (
                      <img
                        src={buildImageUrl(emp.Imagen)}
                        alt={emp.Nombre}
                        className="w-14 h-14 rounded-full object-cover border-2 border-orange-400"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-400">
                        <span className="text-orange-600 font-bold text-lg">
                          {(emp.Nombre || "U")[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg">
                        {emp.Nombre} {emp.Apellidos}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          {emp.Correo}
                        </div>
                        {emp.Telefono && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {emp.Telefono}
                          </div>
                        )}
                        {emp.DNI && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Shield className="w-4 h-4" />
                            DNI: {emp.DNI}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAprobarClick(emp)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleRechazar(emp)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid de 2 columnas: Formulario izquierda, Lista derecha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COLUMNA IZQUIERDA - Formulario */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-sky-500 p-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                {editId ? "Editar Usuario" : "Registrar Usuario"}
              </h2>
              <VoiceMicButton formType="usuario" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-2.5 bg-sky-50 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Foto de perfil */}
              <div className="flex flex-col items-center mb-1">
                <div className="relative">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Foto"
                      className="w-12 h-12 rounded-full object-cover border-2 border-sky-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center border-2 border-sky-400">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-sky-500 hover:bg-sky-600 text-white p-0.5 rounded-full cursor-pointer">
                    <Camera className="w-3 h-3" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* DNI con botón RENIEC */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                  DNI <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    {...register("dni", {
                      required: "El DNI es requerido",
                      pattern: {
                        value: /^[0-9]{8}$/,
                        message: "Debe tener 8 dígitos",
                      },
                    })}
                    className={`flex-1 border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.dni ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="12345678"
                  />
                  <button
                    type="button"
                    onClick={consultarReniec}
                    disabled={buscandoDni}
                    className="px-2.5 bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-gray-400 transition-colors flex items-center justify-center"
                    title="Consultar RENIEC"
                  >
                    {buscandoDni ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {errors.dni && (
                  <span className="text-red-500 text-[10px] mt-0.5 block">{errors.dni.message}</span>
                )}
              </div>

              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("nombre", {
                      required: "El nombre es requerido",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" },
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.nombre ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.nombre && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.nombre.message}</span>
                  )}
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("apellidos", {
                      required: "Los apellidos son requeridos",
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.apellidos ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.apellidos && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.apellidos.message}</span>
                  )}
                </div>
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register("correo", {
                      required: "El correo es requerido",
                      pattern: {
                        value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
                        message: "Correo no válido",
                      },
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.correo ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.correo && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.correo.message}</span>
                  )}
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={9}
                    {...register("telefono", {
                      required: "El teléfono es requerido",
                      pattern: {
                        value: /^[0-9]{9}$/,
                        message: "Debe tener 9 dígitos",
                      },
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.telefono ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.telefono && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.telefono.message}</span>
                  )}
                </div>
              </div>

              {/* Perfil */}
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                  Perfil/Rol <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("perfil", { required: "Seleccione un perfil" })}
                  className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                    errors.perfil ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="administrador">Administrador</option>
                </select>
                {errors.perfil && (
                  <span className="text-red-500 text-[10px] mt-0.5 block">{errors.perfil.message}</span>
                )}
              </div>

              {/* Sucursal - Solo para vendedores */}
              {perfil === "vendedor" && (
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Sucursal <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("sucursal_id", {
                      required: perfil === "vendedor" ? "Seleccione una sucursal" : false
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.sucursal_id ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales
                      .filter((s) => s.estado === "activa")
                      .map((s) => (
                        <option key={s.ID} value={s.ID}>
                          {s.nombre}
                        </option>
                      ))}
                  </select>
                  {errors.sucursal_id && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.sucursal_id.message}</span>
                  )}
                </div>
              )}

              {/* Salario - Solo para vendedores */}
              {perfil === "vendedor" && (
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                    Salario (S/) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("salario", {
                      required: perfil === "vendedor" ? "El salario es requerido" : false,
                      min: { value: 0, message: "Debe ser mayor o igual a 0" },
                    })}
                    className={`w-full border rounded px-2 py-1 text-sm text-gray-900 ${
                      errors.salario ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.salario && (
                    <span className="text-red-500 text-[10px] mt-0.5 block">{errors.salario.message}</span>
                  )}
                </div>
              )}

              {/* Contraseña (solo si es nuevo) */}
              {!editId && (
                <>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        {...register("password", {
                          required: "La contraseña es requerida",
                          minLength: { value: 6, message: "Mínimo 6 caracteres" },
                          validate: {
                            hasUppercase: (v) => /[A-Z]/.test(v) || "Debe tener una mayúscula",
                            hasLowercase: (v) => /[a-z]/.test(v) || "Debe tener una minúscula",
                            hasNumber: (v) => /[0-9]/.test(v) || "Debe tener un número",
                            hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || "Debe tener un carácter especial",
                          },
                        })}
                        className={`w-full border rounded px-2 py-1 pr-10 text-sm text-gray-900 ${
                          errors.password ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="text-red-500 text-[10px] mt-0.5 block">{errors.password.message}</span>
                    )}
                    {/* Barra de fortaleza */}
                    {passwordNueva && (
                      <div className="mt-1.5">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded ${
                                i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-600">
                          Fortaleza: <span className="font-semibold">{passwordStrength.label}</span>
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[9px]">
                          <span className={passwordStrength.checks.length ? "text-green-600" : "text-gray-400"}>
                            {passwordStrength.checks.length ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                            6+ car.
                          </span>
                          <span className={passwordStrength.checks.uppercase ? "text-green-600" : "text-gray-400"}>
                            {passwordStrength.checks.uppercase ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                            May.
                          </span>
                          <span className={passwordStrength.checks.lowercase ? "text-green-600" : "text-gray-400"}>
                            {passwordStrength.checks.lowercase ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                            Min.
                          </span>
                          <span className={passwordStrength.checks.number ? "text-green-600" : "text-gray-400"}>
                            {passwordStrength.checks.number ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                            Núm.
                          </span>
                          <span className={passwordStrength.checks.special ? "text-green-600" : "text-gray-400"}>
                            {passwordStrength.checks.special ? <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                            Esp.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmar contraseña */}
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10">
                      Confirmar Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita la contraseña"
                        {...register("confirmPassword", {
                          required: "Confirme la contraseña",
                          validate: (value) => value === passwordNueva || "Las contraseñas no coinciden",
                        })}
                        className={`w-full border rounded px-2 py-1 pr-10 text-sm text-gray-900 ${
                          errors.confirmPassword ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="text-red-500 text-[10px] mt-0.5 block">{errors.confirmPassword.message}</span>
                    )}
                  </div>
                </>
              )}

              {/* Botones */}
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded text-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </div>
                  ) : (
                    editId ? "Actualizar" : "Guardar"
                  )}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA - Lista */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-sky-400 p-2">
              <h2 className="text-sm font-bold text-white">Lista de Usuarios</h2>
            </div>

            {/* Tabla con scroll */}
            <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-sky-500 text-white sticky top-0">
                  <tr>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">Nombre</th>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">Email</th>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">DNI</th>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">Perfil</th>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">Estado</th>
                    <th className="px-1.5 py-1.5 text-left text-[10px] font-medium uppercase">Salario</th>
                    <th className="px-1.5 py-1.5 text-center text-[10px] font-medium uppercase">Foto</th>
                    <th className="px-1.5 py-1.5 text-center text-[10px] font-medium uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empleados.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-2 py-6 text-center text-gray-500 text-xs">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  ) : (
                    empleados.map((emp) => (
                      <tr key={emp.ID} className="hover:bg-gray-50">
                        {/* Nombre */}
                        <td className="px-1.5 py-1.5">
                          <div>
                            <p className="font-semibold text-gray-800 text-[11px]">
                              {emp.Nombre}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {emp.Apellidos}
                            </p>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-1.5 py-1.5">
                          <div>
                            <p className="text-[11px] text-blue-600">
                              {emp.Correo}
                            </p>
                            {emp.Telefono && (
                              <p className="text-[10px] text-gray-500">
                                {emp.Telefono}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* DNI */}
                        <td className="px-1.5 py-1.5">
                          <p className="text-[11px] text-gray-800">
                            {emp.DNI || "-"}
                          </p>
                        </td>

                        {/* Perfil */}
                        <td className="px-1.5 py-1.5">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              emp.Perfil === "administrador"
                                ? "bg-purple-100 text-purple-700"
                                : emp.Perfil === "gerente"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {emp.Perfil}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-1.5 py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              emp.Estado === "activo"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {emp.Estado}
                          </span>
                        </td>

                        {/* Salario */}
                        <td className="px-1.5 py-1.5">
                          <p className="text-[11px] font-semibold text-gray-800">
                            S/ {emp.Salario ? emp.Salario.toFixed(2) : "0.00"}
                          </p>
                        </td>

                        {/* Foto */}
                        <td className="px-1.5 py-1.5">
                          <div className="flex justify-center">
                            {emp.Imagen ? (
                              <img
                                src={buildImageUrl(emp.Imagen)}
                                alt={emp.Nombre}
                                onClick={() => setFotoAmpliada(buildImageUrl(emp.Imagen))}
                                className="w-7 h-7 rounded-full object-cover border border-sky-400 cursor-pointer hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center border border-sky-300">
                                <span className="text-sky-600 font-bold text-[10px]">
                                  {(emp.Nombre || "U")[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-1.5 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(emp)}
                              className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px]"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => toggleEstado(emp)}
                              className={`p-1 text-white rounded text-[10px] ${
                                emp.Estado === "activo"
                                  ? "bg-amber-500 hover:bg-amber-600"
                                  : "bg-green-500 hover:bg-green-600"
                              }`}
                              title={emp.Estado === "activo" ? "Inhabilitar" : "Activar"}
                            >
                              {emp.Estado === "activo" ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px]"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
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
        </div>
      </div>

      {/* Modal de aprobación */}
      {showModalAprobar && empleadoAprobar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Aprobar Usuario</h2>
              </div>
              <button
                onClick={() => {
                  setShowModalAprobar(false);
                  setEmpleadoAprobar(null);
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Datos del usuario */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  {empleadoAprobar.Imagen ? (
                    <img
                      src={buildImageUrl(empleadoAprobar.Imagen)}
                      alt={empleadoAprobar.Nombre}
                      className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500">
                      <span className="text-green-600 font-bold text-xl">
                        {(empleadoAprobar.Nombre || "U")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg text-gray-800">
                      {empleadoAprobar.Nombre} {empleadoAprobar.Apellidos}
                    </p>
                    <p className="text-sm text-gray-600">{empleadoAprobar.Correo}</p>
                    {empleadoAprobar.DNI && (
                      <p className="text-sm text-gray-600">DNI: {empleadoAprobar.DNI}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulario de aprobación */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perfil / Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formAprobacion.perfil}
                    onChange={(e) =>
                      setFormAprobacion({ ...formAprobacion, perfil: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sucursal <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formAprobacion.sucursal_id}
                    onChange={(e) =>
                      setFormAprobacion({ ...formAprobacion, sucursal_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales
                      .filter((s) => s.estado === "activa")
                      .map((s) => (
                        <option key={s.ID} value={s.ID}>
                          {s.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salario Mensual (S/) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formAprobacion.salario}
                      onChange={(e) =>
                        setFormAprobacion({ ...formAprobacion, salario: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ingrese el salario mensual del empleado
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAprobar}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprobar Usuario
                </button>
                <button
                  onClick={() => {
                    setShowModalAprobar(false);
                    setEmpleadoAprobar(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagen ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
