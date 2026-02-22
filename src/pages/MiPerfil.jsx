import { useState, useEffect, useContext } from "react";
import { useForm } from "react-hook-form";
import { NombreContexto } from "../App2";
import { toast } from "sonner";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Camera, Save, User, Mail, Phone, Lock, KeyRound, CheckCircle, XCircle } from "lucide-react";
import { getToken } from "../funciones/auth";
import { comprimirImagen } from "../funciones/funciones";
import { buildImageUrl } from "../funciones/imageUtils";
import { API_BASE_URL } from "../config";

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MiPerfil() {
  const { usuario, actualizarUsuario } = useContext(NombreContexto);

  const {
    register: registerPerfil,
    handleSubmit: handleSubmitPerfil,
    formState: { errors: errorsPerfil },
    setValue: setValuePerfil,
  } = useForm();

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

  useEffect(() => {
    const fetchMisDatos = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/empleados/mi-perfil`, {
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
          const img = data.Imagen || data.imagen;
          if (img) setPreviewImage(buildImageUrl(img));
        }
      } catch {
        toast.error("Error al cargar los datos del perfil");
      }
    };
    fetchMisDatos();
  }, [setValuePerfil]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("La imagen no debe superar los 5MB");
      return;
    }
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const onSubmitPerfil = async (data) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("Nombre", data.nombre);
      formData.append("Apellidos", data.apellidos);
      formData.append("Correo", data.correo);
      formData.append("Telefono", data.telefono || "");
      if (selectedFile) {
        formData.append("Imagen", await comprimirImagen(selectedFile));
      }

      const res = await fetch(`${API_BASE_URL}/empleados/mi-perfil`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar perfil");
      }

      const updatedData = await res.json();
      const nuevaImagen = updatedData.Imagen || updatedData.imagen;
      if (actualizarUsuario && nuevaImagen) {
        actualizarUsuario({ imagen: nuevaImagen });
      }

      toast.success("Perfil actualizado correctamente");
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/empleados/cambiar-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

  const inputClass = (error) =>
    `w-full border rounded px-2 py-1 text-sm text-gray-900 ${error ? "border-red-500" : "border-gray-300"}`;

  const labelClass = "absolute -top-2 left-3 bg-sky-50 px-1 text-xs font-medium text-gray-700 z-10";

  return (
    <div className="p-3 bg-blue-50 min-h-screen text-sm">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-2.5 mb-3 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-500" />
        <h1 className="text-base font-bold text-gray-800">Mi Perfil</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* COLUMNA 1 - Datos personales */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-400 p-2 flex items-center gap-2">
            <User className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white">Información Personal</h2>
          </div>

          <form
            onSubmit={handleSubmitPerfil(onSubmitPerfil)}
            className="p-2.5 bg-sky-50 space-y-2.5 max-h-[calc(100vh-160px)] overflow-y-auto"
          >
            {/* Foto */}
            <div className="flex flex-col items-center mb-1">
              <div className="relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Foto"
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-400 shadow"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-blue-400">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-sky-500 hover:bg-sky-600 text-white p-0.5 rounded-full cursor-pointer">
                  <Camera className="w-3 h-3" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize font-medium">
                {misDatos?.Perfil || usuario?.perfil}
              </p>
            </div>

            {/* DNI (solo lectura) */}
            <div className="relative">
              <label className={labelClass}>DNI</label>
              <input
                type="text"
                disabled
                {...registerPerfil("dni")}
                className="w-full border rounded px-2 py-1 text-sm text-gray-400 bg-gray-100 cursor-not-allowed border-gray-300"
              />
            </div>

            {/* Nombre y Apellidos en 2 columnas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...registerPerfil("nombre", {
                    required: "Requerido",
                    minLength: { value: 2, message: "Mín. 2 caracteres" },
                  })}
                  className={inputClass(errorsPerfil.nombre)}
                />
                {errorsPerfil.nombre && (
                  <span className="text-red-500 text-[10px]">{errorsPerfil.nombre.message}</span>
                )}
              </div>
              <div className="relative">
                <label className={labelClass}>Apellidos <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...registerPerfil("apellidos", { required: "Requerido" })}
                  className={inputClass(errorsPerfil.apellidos)}
                />
                {errorsPerfil.apellidos && (
                  <span className="text-red-500 text-[10px]">{errorsPerfil.apellidos.message}</span>
                )}
              </div>
            </div>

            {/* Correo y Teléfono en 2 columnas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <label className={labelClass}><Mail className="w-3 h-3 inline mr-0.5" />Correo <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  {...registerPerfil("correo", {
                    required: "Requerido",
                    pattern: { value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, message: "No válido" },
                  })}
                  className={inputClass(errorsPerfil.correo)}
                />
                {errorsPerfil.correo && (
                  <span className="text-red-500 text-[10px]">{errorsPerfil.correo.message}</span>
                )}
              </div>
              <div className="relative">
                <label className={labelClass}><Phone className="w-3 h-3 inline mr-0.5" />Teléfono <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  maxLength={9}
                  {...registerPerfil("telefono", {
                    required: "Requerido",
                    pattern: { value: /^[0-9]{9}$/, message: "9 dígitos" },
                  })}
                  className={inputClass(errorsPerfil.telefono)}
                />
                {errorsPerfil.telefono && (
                  <span className="text-red-500 text-[10px]">{errorsPerfil.telefono.message}</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
              ) : (
                <><Save className="w-3.5 h-3.5" />Guardar Cambios</>
              )}
            </button>

            {/* Info cuenta */}
            {misDatos && (
              <div className="flex items-center justify-between bg-white rounded border border-gray-200 px-2 py-1.5 mt-1">
                <div className="flex items-center gap-1.5">
                  {misDatos.Estado === "activo"
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-amber-500" />}
                  <span className={`text-xs font-semibold ${misDatos.Estado === "activo" ? "text-green-600" : "text-amber-600"}`}>
                    {misDatos.Estado === "activo" ? "Cuenta Activa" : misDatos.Estado}
                  </span>
                </div>
                {misDatos.Salario > 0 && (
                  <span className="text-xs text-green-600 font-semibold">S/ {misDatos.Salario?.toFixed(2)}</span>
                )}
              </div>
            )}
          </form>
        </div>

        {/* COLUMNA 2 - Cambiar contraseña */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-400 p-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white">Cambiar Contraseña</h2>
          </div>

          <form
            onSubmit={handleSubmitPassword(onSubmitPassword)}
            className="p-2.5 bg-sky-50 space-y-2.5 max-h-[calc(100vh-160px)] overflow-y-auto"
          >
            {/* Contraseña actual */}
            <div className="relative">
              <label className={labelClass}>Contraseña actual <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Contraseña actual"
                  {...registerPassword("passwordActual", { required: "Ingrese su contraseña actual" })}
                  className={`${inputClass(errorsPassword.passwordActual)} pr-8`}
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrentPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>
              {errorsPassword.passwordActual && (
                <span className="text-red-500 text-[10px]">{errorsPassword.passwordActual.message}</span>
              )}
            </div>

            {/* Nueva contraseña */}
            <div className="relative">
              <label className={labelClass}>Nueva contraseña <span className="text-red-500">*</span></label>
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
                  className={`${inputClass(errorsPassword.passwordNueva)} pr-8`}
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>
              {errorsPassword.passwordNueva && (
                <span className="text-red-500 text-[10px]">{errorsPassword.passwordNueva.message}</span>
              )}
              {passwordNueva && (
                <div className="mt-1.5">
                  <div className="flex gap-1 mb-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded ${i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600">Seguridad: <span className="font-semibold">{passwordStrength.label}</span></p>
                  <div className="grid grid-cols-2 gap-x-2 mt-0.5">
                    {[
                      { key: "uppercase", label: "Mayúscula" },
                      { key: "lowercase", label: "Minúscula" },
                      { key: "number", label: "Número" },
                      { key: "special", label: "Especial" },
                    ].map(({ key, label }) => (
                      <span key={key} className={`text-[10px] ${passwordStrength.checks[key] ? "text-green-600" : "text-gray-400"}`}>
                        {passwordStrength.checks[key] ? "✓" : "○"} {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="relative">
              <label className={labelClass}>Confirmar contraseña <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita la nueva contraseña"
                  {...registerPassword("confirmarPassword", {
                    required: "Confirme la contraseña",
                    validate: (value) => value === passwordNueva || "Las contraseñas no coinciden",
                  })}
                  className={`${inputClass(errorsPassword.confirmarPassword)} pr-8`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                </button>
              </div>
              {errorsPassword.confirmarPassword && (
                <span className="text-red-500 text-[10px]">{errorsPassword.confirmarPassword.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Cambiando...</>
              ) : (
                <><Lock className="w-3.5 h-3.5" />Cambiar Contraseña</>
              )}
            </button>

            <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              <p className="text-[10px] text-amber-700">
                <strong>Nota:</strong> Deberás iniciar sesión nuevamente después de cambiar tu contraseña.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
