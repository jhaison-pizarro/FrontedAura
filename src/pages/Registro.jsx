import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { ArrowLeft, Search, Upload, User, CheckCircle, XCircle } from "lucide-react";
import { API_BASE_URL } from "../config";
import { comprimirImagen } from "../funciones/funciones";
import VoiceMicButton from "../components/VoiceMicButton";

// Fondos desde carpeta dedicada
import fondo1 from "../assets/fondo-login/fondo1.webp";
import fondo2 from "../assets/fondo-login/fondo2.webp";
import fondo3 from "../assets/fondo-login/fondo3.jpeg";
import fondo4 from "../assets/fondo-login/fondo4.jpeg";
import fondo5 from "../assets/fondo-login/fondo5.jpeg";
import fondo6 from "../assets/fondo-login/fondo6.jpeg";
import fondo7 from "../assets/fondo-login/fondo7.jpeg";
import fondo8 from "../assets/fondo-login/fondo8.png";
import fondo9 from "../assets/fondo-login/fondo9.webp";
import fondo10 from "../assets/fondo-login/fondo10.png";
import fondo11 from "../assets/fondo-login/fondo11.png";
import fondo12 from "../assets/fondo-login/fondo12.png";
import fondo13 from "../assets/fondo-login/fondo13.png";
import fondo14 from "../assets/fondo-login/fondo14.png";
import fondo15 from "../assets/fondo-login/fondo15.png";
import fondo16 from "../assets/fondo-login/fondo16.png";
import fondo17 from "../assets/fondo-login/fondo17.png";
import fondo18 from "../assets/fondo-login/fondo18.png";
import fondo19 from "../assets/fondo-login/fondo19.png";

const fondos = [
  fondo1, fondo2, fondo3, fondo4, fondo5, fondo6, fondo7, fondo8, fondo9,
  fondo10, fondo11, fondo12, fondo13, fondo14, fondo15, fondo16, fondo17, fondo18, fondo19,
];

// Direcciones alternadas para efecto Ken Burns (pan + zoom suave)
const kenBurnsDirections = [
  { from: "scale(1) translate(0%, 0%)", to: "scale(1.15) translate(-2%, -1%)" },
  { from: "scale(1.1) translate(-2%, 0%)", to: "scale(1) translate(2%, 1%)" },
  { from: "scale(1) translate(0%, 0%)", to: "scale(1.12) translate(1%, -2%)" },
  { from: "scale(1.1) translate(1%, 1%)", to: "scale(1) translate(-1%, 0%)" },
  { from: "scale(1) translate(0%, 0%)", to: "scale(1.15) translate(-1%, 2%)" },
  { from: "scale(1.12) translate(0%, -1%)", to: "scale(1) translate(1%, 1%)" },
  { from: "scale(1) translate(0%, 0%)", to: "scale(1.1) translate(2%, -1%)" },
  { from: "scale(1.1) translate(-1%, 1%)", to: "scale(1) translate(0%, -1%)" },
  { from: "scale(1) translate(0%, 0%)", to: "scale(1.12) translate(-2%, 1%)" },
];

export function SignUp() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm({ mode: "onChange" });

  const [fondoActual, setFondoActual] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const passwordNueva = watch("password");
  const confirmPassword = watch("confirmPassword");

  // Rotación de fondos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setFondoActual((prev) => (prev + 1) % fondos.length);
    }, 6000);
    return () => clearInterval(intervalo);
  }, []);

  // Cargar sucursales
  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sucursales/public`);
        if (res.ok) {
          const data = await res.json();
          setSucursales(data);
        }
      } catch (error) {
        console.error("Error al cargar sucursales:", error);
      }
    };
    fetchSucursales();
  }, []);

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

  // Manejar selección de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning("La imagen no debe superar los 5MB");
        return;
      }
      setSelectedFile(file);
      setPrevisualizacion(URL.createObjectURL(file));
    }
  };

  // Enviar formulario
  const onSubmit = async (formValues) => {
    if (formValues.password !== formValues.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Registrando cuenta...");
    try {
      const formData = new FormData();
      formData.append("dni", formValues.dni);
      formData.append("nombre", formValues.nombre);
      formData.append("apellidos", formValues.apellidos);
      formData.append("correo", formValues.correo);
      formData.append("telefono", formValues.telefono || "");
      formData.append("direccion", formValues.direccion || "");
      formData.append("password", formValues.password);

      if (formValues.sucursal_id) {
        formData.append("sucursal_id", formValues.sucursal_id);
      }

      if (selectedFile) {
        const imagenComprimida = await comprimirImagen(selectedFile);
        formData.append("imagen", imagenComprimida, "usuario.jpg");
      }

      const response = await fetch(`${API_BASE_URL}/registro`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || "Registro exitoso. Su cuenta está pendiente de aprobación.", { id: toastId });
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast.error(result.error || result.message || "Error al registrar usuario", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión. Intente nuevamente.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const getFormContext = () => ({
    formData: watch(),
    setValue,
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fondos rotativos con efecto Ken Burns (pan + zoom suave) */}
      <div className="absolute inset-0 bg-blue-950">
        {fondos.map((fondo, index) => {
          const isActive = index === fondoActual;
          const dir = kenBurnsDirections[index % kenBurnsDirections.length];
          return (
            <div
              key={index}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${fondo})`,
                opacity: isActive ? 1 : 0,
                transform: isActive ? dir.to : dir.from,
                transition: 'opacity 2s ease-in-out, transform 7s ease-in-out',
                zIndex: isActive ? 2 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/20 z-20"></div>

      {/* Contenido */}
      <div className="relative z-30 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          {/* Header con botón volver y voice */}
          <div className="bg-slate-800/60 p-2 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Volver al Login</span>
            </button>
            <VoiceMicButton accion="registrar_empleado" getFormContext={getFormContext} />
          </div>

          {/* Body del formulario */}
          <div className="p-3 overflow-y-auto max-h-[calc(100vh-60px)]">
            <div className="text-center mb-2">
              <h1 className="text-base font-bold text-white mb-0.5">Crear Cuenta Nueva</h1>
              <p className="text-gray-300 text-xs">Complete el formulario para registrarse</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
              {/* Foto arriba */}
              <div className="flex justify-center mb-1">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 bg-gray-800/50">
                    {previsualizacion ? (
                      <img src={previsualizacion} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-7 h-7 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-sky-500 hover:bg-sky-600 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors">
                    <Upload className="w-4 h-4" />
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
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  DNI <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    {...register("dni", {
                      required: "DNI requerido",
                      pattern: { value: /^[0-9]{8}$/, message: "DNI debe tener 8 dígitos" }
                    })}
                    className={`flex-1 px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                      errors.dni ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="12345678"
                  />
                  <button
                    type="button"
                    onClick={consultarReniec}
                    disabled={buscandoDni}
                    className="px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:bg-gray-400 transition-colors"
                  >
                    {buscandoDni ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.dni && <span className="text-red-400 text-xs mt-0.5 block">{errors.dni.message}</span>}
              </div>

              {/* Nombre */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("nombre", {
                    required: "Nombre requerido",
                    minLength: { value: 2, message: "Mínimo 2 caracteres" }
                  })}
                  className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                    errors.nombre ? "border-red-500" : "border-blue-500/30"
                  }`}
                  placeholder="Juan"
                />
                {errors.nombre && <span className="text-red-400 text-xs mt-0.5 block">{errors.nombre.message}</span>}
              </div>

              {/* Apellidos */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("apellidos", {
                    required: "Apellidos requeridos",
                    minLength: { value: 2, message: "Mínimo 2 caracteres" }
                  })}
                  className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                    errors.apellidos ? "border-red-500" : "border-blue-500/30"
                  }`}
                  placeholder="Pérez García"
                />
                {errors.apellidos && <span className="text-red-400 text-xs mt-0.5 block">{errors.apellidos.message}</span>}
              </div>

              {/* Correo + Rol en la misma fila */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register("correo", {
                      required: "Correo requerido",
                      pattern: { value: /^\S+@\S+$/i, message: "Correo inválido" }
                    })}
                    className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                      errors.correo ? "border-red-500" : "border-blue-500/30"
                    }`}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.correo && <span className="text-red-400 text-xs mt-0.5 block">{errors.correo.message}</span>}
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("perfil", { required: "Seleccione un rol" })}
                    className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                      errors.perfil ? "border-red-500" : "border-blue-500/30"
                    }`}
                  >
                    <option value="" className="bg-slate-900">Seleccionar...</option>
                    <option value="vendedor" className="bg-slate-900">Vendedor</option>
                    <option value="gerente" className="bg-slate-900">Gerente</option>
                    <option value="administrador" className="bg-slate-900">Administrador</option>
                  </select>
                  {errors.perfil && <span className="text-red-400 text-xs mt-0.5 block">{errors.perfil.message}</span>}
                </div>
              </div>

              {/* Teléfono */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={9}
                  {...register("telefono", {
                    required: "Teléfono requerido",
                    pattern: { value: /^[0-9]{9}$/, message: "9 dígitos numéricos" }
                  })}
                  className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                    errors.telefono ? "border-red-500" : "border-blue-500/30"
                  }`}
                  placeholder="987654321"
                />
                {errors.telefono && <span className="text-red-400 text-xs mt-0.5 block">{errors.telefono.message}</span>}
              </div>

              {/* Dirección */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("direccion", { required: "Dirección requerida" })}
                  className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                    errors.direccion ? "border-red-500" : "border-blue-500/30"
                  }`}
                  placeholder="Av. Principal 123"
                />
                {errors.direccion && <span className="text-red-400 text-xs mt-0.5 block">{errors.direccion.message}</span>}
              </div>

              {/* Sucursal - siempre visible */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Sucursal <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("sucursal_id", { required: "Seleccione una sucursal" })}
                  className={`w-full px-3 py-1.5 bg-blue-800/30 border border-blue-500/30 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                    errors.sucursal_id ? "border-red-500" : "border-blue-500/30"
                  }`}
                >
                  <option value="" className="bg-slate-900">Seleccionar sucursal...</option>
                  {sucursales.map((suc) => (
                    <option key={suc.ID || suc.id} value={suc.ID || suc.id} className="bg-slate-900">
                      {suc.nombre || suc.Nombre}
                    </option>
                  ))}
                </select>
                {errors.sucursal_id && <span className="text-red-400 text-xs mt-0.5 block">{errors.sucursal_id.message}</span>}
              </div>

              {/* Contraseña */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    {...register("password", {
                      required: "Contraseña requerida",
                      minLength: { value: 6, message: "Mínimo 6 caracteres" },
                      validate: {
                        hasUppercase: (v) => /[A-Z]/.test(v) || "Debe tener una mayúscula",
                        hasLowercase: (v) => /[a-z]/.test(v) || "Debe tener una minúscula",
                        hasNumber: (v) => /[0-9]/.test(v) || "Debe tener un número",
                        hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || "Debe tener un carácter especial",
                      },
                      onChange: () => { if (watch("confirmPassword")) trigger("confirmPassword"); },
                    })}
                    className={`w-full px-3 py-1.5 pr-10 bg-blue-800/30 border border-blue-500/30 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-red-400 text-xs mt-0.5 block">{errors.password.message}</span>
                )}
                {/* Barra de fortaleza */}
                {passwordNueva && (
                  <div className="mt-2">
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
                    <p className="text-xs text-gray-200">
                      Fortaleza: <span className="font-semibold">{passwordStrength.label}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs">
                      <span className={passwordStrength.checks.length ? "text-green-300" : "text-gray-300"}>
                        {passwordStrength.checks.length ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        6+ caracteres
                      </span>
                      <span className={passwordStrength.checks.uppercase ? "text-green-300" : "text-gray-300"}>
                        {passwordStrength.checks.uppercase ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        Mayúscula
                      </span>
                      <span className={passwordStrength.checks.lowercase ? "text-green-300" : "text-gray-300"}>
                        {passwordStrength.checks.lowercase ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        Minúscula
                      </span>
                      <span className={passwordStrength.checks.number ? "text-green-300" : "text-gray-300"}>
                        {passwordStrength.checks.number ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        Número
                      </span>
                      <span className={passwordStrength.checks.special ? "text-green-300" : "text-gray-300"}>
                        {passwordStrength.checks.special ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        Especial
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-slate-900/90 text-xs font-medium text-sky-200 z-10">
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
                    className={`w-full px-3 py-1.5 pr-10 bg-blue-800/30 border border-blue-500/30 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent ${
                      errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors"
                  >
                    {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="text-red-400 text-xs mt-0.5 block">{errors.confirmPassword.message}</span>
                )}
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 hover:from-sky-700 hover:via-sky-600 hover:to-sky-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-3 text-sm"
              >
                {loading ? "Registrando..." : "Crear Cuenta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
