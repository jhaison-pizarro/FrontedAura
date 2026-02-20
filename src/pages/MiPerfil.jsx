import React, { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { NombreContexto } from "../App2";
import { toast } from "sonner";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Camera, Save, User, Mail, Phone, Lock, KeyRound, CheckCircle, XCircle } from "lucide-react";
import { getToken } from "../funciones/auth";
import { comprimirImagen } from "../funciones/funciones";
import { buildImageUrl } from "../funciones/imageUtils";
import { API_BASE_URL } from "../config";

const API_URL = API_BASE_URL;

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MiPerfil() {
  const { usuario, actualizarUsuario } = useContext(NombreContexto);

  // Form para datos personales
  const {
    register: registerPerfil,
    handleSubmit: handleSubmitPerfil,
    formState: { errors: errorsPerfil },
    setValue: setValuePerfil,
    watch: watchPerfil,
  } = useForm();

  // Form para cambio de contraseña
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: errorsPassword },
    watch: watchPassword,
    reset: resetPassword,
  } = useForm();

  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [misDatos, setMisDatos] = useState(null);

  const passwordNueva = watchPassword("passwordNueva");

  // Cargar datos del usuario actual
  useEffect(() => {
    const fetchMisDatos = async () => {
      try {
        const res = await fetch(`${API_URL}/empleados/mi-perfil`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setMisDatos(data);
          setValuePerfil("nombre", data.Nombre || "");
          setValuePerfil("apellidos", data.Apellidos || "");
          setValuePerfil("correo", data.Correo || "");
          setValuePerfil("telefono", data.Telefono || "");
          setValuePerfil("dni", data.DNI || "");
          if (data.imagen) {
            setPreviewImage(buildImageUrl(data.imagen));
          }
        }
      } catch (err) {
        toast.error("Error al cargar los datos del perfil");
      }
    };
    fetchMisDatos();
  }, [setValuePerfil]);

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

  // Guardar cambios del perfil
  const onSubmitPerfil = async (data) => {
    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("Nombre", data.nombre);
      formDataToSend.append("Apellidos", data.apellidos);
      formDataToSend.append("Correo", data.correo);
      formDataToSend.append("Telefono", data.telefono || "");

      if (selectedFile) {
        formDataToSend.append("Imagen", await comprimirImagen(selectedFile));
      }

      const res = await fetch(`${API_URL}/empleados/mi-perfil`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar perfil");
      }

      const updatedData = await res.json();

      // Actualizar contexto con nueva imagen si cambió
      if (actualizarUsuario && updatedData.imagen) {
        actualizarUsuario({ imagenUrl: updatedData.imagen });
      }

      toast.success("Perfil actualizado correctamente");
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar contraseña
  const onSubmitPassword = async (data) => {
    setIsChangingPassword(true);

    try {
      const res = await fetch(`${API_URL}/empleados/cambiar-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          password_actual: data.passwordActual,
          password_nueva: data.passwordNueva,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al cambiar contraseña");
      }

      toast.success("Contraseña actualizada correctamente");
      resetPassword();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsChangingPassword(false);
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

  return (
    <div className="p-2 sm:p-4 bg-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4 max-w-4xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800">
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
          MI PERFIL
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Tarjeta de información personal */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-500" />
            Información Personal
          </h2>

          <form onSubmit={handleSubmitPerfil(onSubmitPerfil)} className="space-y-3">
            {/* Foto de perfil */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Foto de perfil"
                    className="w-20 h-20 rounded-full object-cover border-4 border-sky-400 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-sky-400">
                    <User className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded-full cursor-pointer shadow-lg transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2 capitalize">
                {misDatos?.Perfil || usuario?.perfil}
              </p>
            </div>

            {/* DNI (solo lectura) */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-500 z-10">
                DNI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled
                {...registerPerfil("dni")}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed text-sm"
              />
            </div>

            {/* Nombre */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerPerfil("nombre", {
                  required: "El nombre es requerido",
                  minLength: { value: 2, message: "Mínimo 2 caracteres" },
                })}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                  errorsPerfil.nombre ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errorsPerfil.nombre && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPerfil.nombre.message}</span>
              )}
            </div>

            {/* Apellidos */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerPerfil("apellidos", {
                  required: "Los apellidos son requeridos",
                })}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                  errorsPerfil.apellidos ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errorsPerfil.apellidos && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPerfil.apellidos.message}</span>
              )}
            </div>

            {/* Correo */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Correo <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...registerPerfil("correo", {
                  required: "El correo es requerido",
                  pattern: {
                    value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
                    message: "Correo no válido",
                  },
                })}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                  errorsPerfil.correo ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errorsPerfil.correo && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPerfil.correo.message}</span>
              )}
            </div>

            {/* Teléfono */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="987654321"
                maxLength={9}
                {...registerPerfil("telefono", {
                  required: "El teléfono es requerido",
                  pattern: {
                    value: /^[0-9]{9}$/,
                    message: "Debe tener 9 dígitos numéricos",
                  },
                })}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                  errorsPerfil.telefono ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errorsPerfil.telefono && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPerfil.telefono.message}</span>
              )}
            </div>

            {/* Botón guardar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tarjeta de cambio de contraseña */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-5">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            Cambiar Contraseña
          </h2>

          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-3">
            {/* Contraseña actual */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10">
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Ingrese su contraseña actual"
                  {...registerPassword("passwordActual", {
                    required: "Ingrese su contraseña actual",
                  })}
                  className={`w-full px-3 py-2 pr-10 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errorsPassword.passwordActual ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              {errorsPassword.passwordActual && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPassword.passwordActual.message}</span>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  {...registerPassword("passwordNueva", {
                    required: "Ingrese la nueva contraseña",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                    validate: {
                      hasUppercase: (v) => /[A-Z]/.test(v) || "Debe tener una mayúscula",
                      hasLowercase: (v) => /[a-z]/.test(v) || "Debe tener una minúscula",
                      hasNumber: (v) => /[0-9]/.test(v) || "Debe tener un número",
                      hasSpecial: (v) => /[^A-Za-z0-9]/.test(v) || "Debe tener un carácter especial",
                    },
                  })}
                  className={`w-full px-3 py-2 pr-10 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errorsPassword.passwordNueva ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
              {errorsPassword.passwordNueva && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPassword.passwordNueva.message}</span>
              )}
              {/* Barra de fortaleza e indicadores */}
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
                  <p className={`text-xs ${passwordStrength.color.replace("bg-", "text-")}`}>
                    Seguridad: {passwordStrength.label}
                  </p>
                  {/* Indicadores de requisitos */}
                  <div className="grid grid-cols-2 gap-x-2 mt-1">
                    <span className={`text-[10px] ${passwordStrength.checks?.uppercase ? "text-green-500" : "text-gray-400"}`}>
                      {passwordStrength.checks?.uppercase ? "✓" : "○"} Mayúscula
                    </span>
                    <span className={`text-[10px] ${passwordStrength.checks?.lowercase ? "text-green-500" : "text-gray-400"}`}>
                      {passwordStrength.checks?.lowercase ? "✓" : "○"} Minúscula
                    </span>
                    <span className={`text-[10px] ${passwordStrength.checks?.number ? "text-green-500" : "text-gray-400"}`}>
                      {passwordStrength.checks?.number ? "✓" : "○"} Número
                    </span>
                    <span className={`text-[10px] ${passwordStrength.checks?.special ? "text-green-500" : "text-gray-400"}`}>
                      {passwordStrength.checks?.special ? "✓" : "○"} Especial (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-xs font-medium text-gray-700 z-10">
                Confirmar contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita la nueva contraseña"
                  {...registerPassword("confirmarPassword", {
                    required: "Confirme la contraseña",
                    validate: (value) => value === passwordNueva || "Las contraseñas no coinciden",
                  })}
                  className={`w-full px-3 py-2 pr-10 bg-white border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errorsPassword.confirmarPassword ? "border-red-500" : "border-gray-300"
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
              {errorsPassword.confirmarPassword && (
                <span className="text-red-500 text-xs mt-0.5 block">{errorsPassword.confirmarPassword.message}</span>
              )}
            </div>

            {/* Botón cambiar contraseña */}
            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isChangingPassword ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Cambiando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </form>

          {/* Info adicional */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Nota:</strong> Por seguridad, deberás iniciar sesión nuevamente después de cambiar tu contraseña.
            </p>
          </div>
        </div>
      </div>

      {/* Info del estado de cuenta */}
      {misDatos && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-3 sm:p-4 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              {misDatos.Estado === "activo" ? (
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Estado de cuenta</p>
                <p className={`font-semibold text-sm sm:text-base ${
                  misDatos.Estado === "activo" ? "text-green-600" : "text-amber-600"
                }`}>
                  {misDatos.Estado === "activo" ? "Cuenta Activa" : misDatos.Estado}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs sm:text-sm text-gray-500">Rol asignado</p>
              <p className="font-semibold text-sm sm:text-base text-sky-600 capitalize">{misDatos.Perfil}</p>
            </div>
            {misDatos.Salario > 0 && (
              <div className="sm:text-right">
                <p className="text-xs sm:text-sm text-gray-500">Salario</p>
                <p className="font-semibold text-sm sm:text-base text-green-600">S/ {misDatos.Salario?.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
