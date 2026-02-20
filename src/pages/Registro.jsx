import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { ArrowLeft, Search, Upload, User, CheckCircle, XCircle } from "lucide-react";
import { API_BASE_URL } from "../config";
import { comprimirImagen } from "../funciones/funciones";
import VoiceMicButton from "../components/VoiceMicButton";

// Importar las mismas imágenes del login
import fondo1 from "../assets/DALL·E 2024-09-26 18.10.00 - A stylish and elegant background image for a clothing store specializing in evening gowns and formal dresses. The design features a luxurious setting .webp";
import fondo2 from "../assets/fondo.webp";
import fondo3 from "../assets/Designer.jpeg";
import fondo4 from "../assets/Designer (1).jpeg";
import fondo5 from "../assets/Designer (2).jpeg";
import fondo6 from "../assets/Designer (3).jpeg";
import fondo7 from "../assets/Designer (4).jpeg";
import fondo8 from "../assets/fondo1.png";
import fondo9 from "../assets/imasdd.webp";

const fondos = [fondo1, fondo2, fondo3, fondo4, fondo5, fondo6, fondo7, fondo8, fondo9];

export function SignUp() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();

  const [fondoActual, setFondoActual] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [sucursales, setSucursales] = useState([]);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const perfil = watch("perfil");
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
        const res = await fetch(`${API_BASE_URL}/sucursales`);
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
  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("dni", data.dni);
      formData.append("nombre", data.nombre);
      formData.append("apellidos", data.apellidos);
      formData.append("correo", data.correo);
      formData.append("telefono", data.telefono);
      formData.append("direccion", data.direccion);
      formData.append("password", data.password);
      formData.append("perfil", data.perfil);

      if (data.perfil === "vendedor" && data.sucursal_id) {
        formData.append("sucursal_id", data.sucursal_id);
      }

      if (selectedFile) {
        const imagenComprimida = await comprimirImagen(selectedFile);
        formData.append("imagen", imagenComprimida, "usuario.jpg");
      }

      const response = await fetch(`${API_BASE_URL}/registro`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Usuario registrado exitosamente");
        navigate("/");
      } else {
        const error = await response.json();
        toast.error(error.message || "Error al registrar usuario");
      }
    } catch (error) {
      toast.error("Error al registrar usuario");
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
      {/* Fondos rotativos */}
      <div className="absolute inset-0 bg-gray-900">
        {fondos.map((fondo, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-2000 ${
              index === fondoActual ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
            style={{ backgroundImage: `url(${fondo})`, willChange: 'opacity' }}
          />
        ))}
      </div>

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/20 z-20"></div>

      {/* Contenido */}
      <div className="relative z-30 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900/30 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          {/* Header con botón volver y voice */}
          <div className="bg-sky-500/80 backdrop-blur-sm p-3 flex items-center justify-between">
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
          <div className="p-4 bg-gray-900/20 backdrop-blur-sm">
            <div className="text-center mb-3">
              <h1 className="text-xl font-bold text-white mb-1">Crear Cuenta Nueva</h1>
              <p className="text-gray-300 text-xs">Complete el formulario para registrarse</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
              {/* Foto arriba */}
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white/30 bg-gray-800/50">
                    {previsualizacion ? (
                      <img src={previsualizacion} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
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
                <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
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
                    className={`flex-1 px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
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

              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("nombre", {
                      required: "Nombre requerido",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" }
                    })}
                    className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                      errors.nombre ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Juan"
                  />
                  {errors.nombre && <span className="text-red-400 text-xs mt-0.5 block">{errors.nombre.message}</span>}
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("apellidos", {
                      required: "Apellidos requeridos",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" }
                    })}
                    className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                      errors.apellidos ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Pérez García"
                  />
                  {errors.apellidos && <span className="text-red-400 text-xs mt-0.5 block">{errors.apellidos.message}</span>}
                </div>
              </div>

              {/* Correo */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register("correo", {
                    required: "Correo requerido",
                    pattern: { value: /^\S+@\S+$/i, message: "Correo inválido" }
                  })}
                  className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                    errors.correo ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="correo@ejemplo.com"
                />
                {errors.correo && <span className="text-red-400 text-xs mt-0.5 block">{errors.correo.message}</span>}
              </div>

              {/* Teléfono y Dirección */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    {...register("telefono", {
                      required: "Teléfono requerido",
                      pattern: { value: /^[0-9]{9}$/, message: "9 dígitos numéricos" }
                    })}
                    className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                      errors.telefono ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="987654321"
                  />
                  {errors.telefono && <span className="text-red-400 text-xs mt-0.5 block">{errors.telefono.message}</span>}
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                    Dirección <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("direccion", { required: "Dirección requerida" })}
                    className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                      errors.direccion ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Av. Principal 123"
                  />
                  {errors.direccion && <span className="text-red-400 text-xs mt-0.5 block">{errors.direccion.message}</span>}
                </div>
              </div>

              {/* Rol */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("perfil", { required: "Seleccione un rol" })}
                  className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                    errors.perfil ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="administrador">Administrador</option>
                </select>
                {errors.perfil && <span className="text-red-400 text-xs mt-0.5 block">{errors.perfil.message}</span>}
              </div>

              {/* Sucursal condicional */}
              {perfil === "vendedor" && (
                <div className="relative">
                  <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
                    Sucursal <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("sucursal_id", {
                      required: perfil === "vendedor" ? "Seleccione una sucursal" : false
                    })}
                    className={`w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 text-white rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400/50 ${
                      errors.sucursal_id ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales.map((suc) => (
                      <option key={suc.ID || suc.id} value={suc.ID || suc.id}>
                        {suc.nombre || suc.Nombre}
                      </option>
                    ))}
                  </select>
                  {errors.sucursal_id && <span className="text-red-400 text-xs mt-0.5 block">{errors.sucursal_id.message}</span>}
                </div>
              )}

              {/* Contraseña */}
              <div className="relative">
                <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
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
                    })}
                    className={`w-full px-3 py-2 pr-10 bg-white/90 border rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-400/50 ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                <label className="absolute -top-2 left-3 px-1 bg-gray-900/80 text-xs font-medium text-gray-300 z-10">
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
                    className={`w-full px-3 py-2 pr-10 bg-white/90 border rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-400/50 ${
                      errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                className="w-full bg-blue-600/80 hover:bg-blue-700/80 text-white font-semibold py-2.5 rounded-lg transition-all disabled:bg-gray-500/50 disabled:cursor-not-allowed mt-3 shadow-lg"
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
