import { useState, useEffect, useContext } from "react";
import { FaEye, FaEyeSlash, FaUser, FaLock } from "react-icons/fa";
import { Mail, X, Clock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { setToken, setUsuario, API_BASE_URL } from "../funciones/auth";
import { NombreContexto } from "../App2";
import { buildImageUrl } from "../funciones/imageUtils";
import { useNavigate } from "react-router-dom";

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

const fondosLogin = [
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

export function Login() {
  const { iniciarSesion } = useContext(NombreContexto);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fondoActual, setFondoActual] = useState(0);
  const [empresaConfig, setEmpresaConfig] = useState(null);

  // Estados para recuperación de contraseña
  const [showRecuperacion, setShowRecuperacion] = useState(false);
  const [paso, setPaso] = useState(1);
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmarPassword, setShowConfirmarPassword] = useState(false);
  const [isSolicitando, setIsSolicitando] = useState(false);
  const [isVerificando, setIsVerificando] = useState(false);
  const [isCambiando, setIsCambiando] = useState(false);

  // Fondo rotativo - cambia cada 6 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setFondoActual((prev) => (prev + 1) % fondosLogin.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fetch configuración de la empresa
  useEffect(() => {
    fetch(`${API_BASE_URL}/configuracion`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEmpresaConfig(data))
      .catch(() => setEmpresaConfig(null));
  }, []);

  // Temporizador para el código
  useEffect(() => {
    if (tiempoRestante > 0) {
      const timer = setTimeout(() => setTiempoRestante(tiempoRestante - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [tiempoRestante]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Complete todos los campos");
      return;
    }

    localStorage.clear();

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        // Backend retorna {message, estado} para pendiente/inactivo, {error} para credenciales inválidas
        const msg = result.message || result.error || "Error en el login";
        if (result.estado === "pendiente") {
          toast.warning(msg);
        } else if (result.estado === "inactivo") {
          toast.error(msg);
        } else {
          toast.error(msg);
        }
        setIsSubmitting(false);
        return;
      }

      const usuarioData = {
        nombre: result.nombre,
        perfil: result.perfil,
        imagen: result.imagen,
        sucursal_id: result.sucursal_id,
        sucursal_nombre: result.sucursal_nombre,
      };

      setToken(result.token);
      setUsuario(usuarioData);

      toast.success("Bienvenido " + usuarioData.nombre);
      iniciarSesion(usuarioData);
    } catch (error) {
      toast.error("Error de conexión");
      setIsSubmitting(false);
    }
  };

  const handleSolicitarCodigo = async () => {
    if (!emailRecuperacion) {
      toast.error("Ingrese su correo");
      return;
    }

    setIsSolicitando(true);
    const toastId = toast.loading("Enviando código...");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/solicitar-recuperacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Código enviado a su correo", { id: toastId });
        setPaso(2);
        setTiempoRestante(120);
      } else {
        toast.error(result.error || result.mensaje || "Error al enviar código", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión", { id: toastId });
    } finally {
      setIsSolicitando(false);
    }
  };

  const handleVerificarCodigo = async () => {
    if (!codigo) {
      toast.error("Ingrese el código");
      return;
    }

    if (tiempoRestante === 0) {
      toast.error("El código ha expirado");
      return;
    }

    setIsVerificando(true);
    const toastId = toast.loading("Verificando código...");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verificar-codigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion, codigo }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Código verificado correctamente", { id: toastId });
        setPaso(3);
      } else {
        toast.error(result.error || result.mensaje || "Código incorrecto o expirado", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión", { id: toastId });
    } finally {
      setIsVerificando(false);
    }
  };

  // Calcula la fortaleza de la contraseña (0-5)
  const calcularFortaleza = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const fortalezaInfo = (score) => {
    if (score === 0) return { label: "", color: "", bg: "" };
    if (score <= 2) return { label: "Débil", color: "text-red-400", bg: "bg-red-500" };
    if (score === 3) return { label: "Media", color: "text-yellow-400", bg: "bg-yellow-500" };
    if (score === 4) return { label: "Buena", color: "text-blue-400", bg: "bg-blue-500" };
    return { label: "Fuerte", color: "text-green-400", bg: "bg-green-500" };
  };

  const handleCambiarPassword = async () => {
    if (!nuevaPassword || !confirmarPassword) {
      toast.error("Complete todos los campos");
      return;
    }

    const fortaleza = calcularFortaleza(nuevaPassword);
    if (fortaleza < 5) {
      toast.error("La contraseña debe ser fuerte (mayúscula, minúscula, número, símbolo y mín. 8 caracteres)");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsCambiando(true);
    const toastId = toast.loading("Cambiando contraseña...");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/restablecer-contrasena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailRecuperacion,
          codigo,
          nueva_contrasena: nuevaPassword,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Contraseña cambiada exitosamente", { id: toastId });
        setShowRecuperacion(false);
        setPaso(1);
        setEmailRecuperacion("");
        setCodigo("");
        setNuevaPassword("");
        setConfirmarPassword("");
        setTiempoRestante(0);
      } else {
        toast.error(result.error || result.mensaje || "Error al cambiar contraseña", { id: toastId });
      }
    } catch {
      toast.error("Error de conexión", { id: toastId });
    } finally {
      setIsCambiando(false);
    }
  };

  const abrirRecuperacion = (e) => {
    e.preventDefault();
    setShowRecuperacion(true);
    setPaso(1);
    setEmailRecuperacion("");
    setCodigo("");
    setNuevaPassword("");
    setConfirmarPassword("");
  };

  const abrirRegistro = (e) => {
    e.preventDefault();
    navigate("/registro");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-blue-950">
      {/* Fondos rotativos con efecto Ken Burns (pan + zoom suave) */}
      {fondosLogin.map((fondo, index) => {
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

      {/* Overlay semi-transparente oscuro */}
      <div className="absolute inset-0 bg-black/20 z-20"></div>

      {/* Tarjeta de Login */}
      <div className="relative w-full max-w-[380px] bg-slate-900/70 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden z-30">
        {/* Header con logo */}
        <div className="bg-slate-800/60 p-6 text-center border-b border-slate-600/30">
          {empresaConfig?.logo ? (
            <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-white/90 p-1.5 shadow-lg flex items-center justify-center border-2 border-sky-400/50">
              <img
                src={buildImageUrl(empresaConfig.logo)}
                alt="Logo"
                className="w-full h-full object-contain rounded-md"
              />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-white/90 shadow-lg flex items-center justify-center border-2 border-sky-400/50">
              <span className="text-sky-600 font-bold text-2xl">A</span>
            </div>
          )}

          <h1 className="text-xl font-bold text-white mb-1">
            {empresaConfig?.nombre_empresa || "AURA"}
          </h1>
          <p className="text-gray-200 text-xs">
            {empresaConfig?.lema || "Alquiler y Venta"}
          </p>
        </div>

        {/* Formulario */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-4 text-center">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Correo */}
            <div>
              <label className="block text-xs text-sky-300 mb-1 ml-1 font-medium">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                  <FaUser size={14} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-blue-800/30 border border-blue-500/30 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-xs text-sky-300 mb-1 ml-1 font-medium">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80 z-10">
                  <FaLock size={14} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-11 py-2.5 bg-blue-800/30 border border-blue-500/30 rounded-lg text-white text-sm placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/80 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors z-10"
                >
                  {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón de Login */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 hover:from-sky-700 hover:via-sky-600 hover:to-sky-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando...</span>
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Enlaces de ayuda */}
          <div className="flex flex-col items-center gap-2 mt-4 pt-3 border-t border-gray-700/30">
            <button
              onClick={abrirRecuperacion}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              onClick={abrirRegistro}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors font-medium"
            >
              Crear cuenta nueva
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-800/50 border-t border-gray-700/40 text-center">
          <p className="text-[10px] text-gray-400">
            © 2025 {empresaConfig?.nombre_empresa || "AURA"}
          </p>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {showRecuperacion && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100]">
          <div className="relative w-full max-w-md bg-gray-900/90 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-sky-700/60 via-sky-600/60 to-sky-700/60 p-4 flex items-center justify-between border-b border-gray-600/30">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Recuperar Contraseña</h2>
              </div>
              <button
                onClick={() => setShowRecuperacion(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {paso === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Ingrese su correo y le enviaremos un código de verificación válido por 2 minutos.
                  </p>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={emailRecuperacion}
                      onChange={(e) => setEmailRecuperacion(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleSolicitarCodigo}
                    disabled={isSolicitando}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSolicitando ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      "Enviar Código"
                    )}
                  </button>
                </div>
              )}

              {paso === 2 && (
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                    <p className="text-sm text-green-300">
                      Código enviado a <span className="font-semibold">{emailRecuperacion}</span>
                    </p>
                  </div>

                  {tiempoRestante > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock size={16} className="text-sky-400" />
                      <span>Código válido por: <span className="font-semibold text-sky-400">{Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}</span></span>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Código de 6 dígitos"
                      maxLength={6}
                      className="w-full px-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaso(1)}
                      className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleVerificarCodigo}
                      disabled={isVerificando}
                      className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerificando ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verificando...</span>
                        </div>
                      ) : (
                        "Verificar"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {paso === 3 && (() => {
                const score = calcularFortaleza(nuevaPassword);
                const { label, color, bg } = fortalezaInfo(score);
                const noCoinciden = confirmarPassword.length > 0 && nuevaPassword !== confirmarPassword;
                const puedeEnviar = score === 5 && nuevaPassword === confirmarPassword && confirmarPassword.length > 0;
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">Ingrese su nueva contraseña</p>

                    {/* Nueva contraseña */}
                    <div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                          <FaLock size={14} />
                        </div>
                        <input
                          type={showNuevaPassword ? "text" : "password"}
                          value={nuevaPassword}
                          onChange={(e) => setNuevaPassword(e.target.value)}
                          placeholder="Nueva contraseña"
                          className="w-full pl-9 pr-10 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNuevaPassword(!showNuevaPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors"
                        >
                          {showNuevaPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>

                      {/* Barra de fortaleza */}
                      {nuevaPassword.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  i <= score ? bg : "bg-gray-600/50"
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-xs font-medium ${color}`}>
                            Contraseña {label}
                            {score < 5 && (
                              <span className="text-gray-400 font-normal ml-1">
                                — necesita: {[
                                  nuevaPassword.length < 8 && "8+ caracteres",
                                  !/[A-Z]/.test(nuevaPassword) && "mayúscula",
                                  !/[a-z]/.test(nuevaPassword) && "minúscula",
                                  !/[0-9]/.test(nuevaPassword) && "número",
                                  !/[^A-Za-z0-9]/.test(nuevaPassword) && "símbolo",
                                ].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                          <FaLock size={14} />
                        </div>
                        <input
                          type={showConfirmarPassword ? "text" : "password"}
                          value={confirmarPassword}
                          onChange={(e) => setConfirmarPassword(e.target.value)}
                          placeholder="Confirmar contraseña"
                          className={`w-full pl-9 pr-10 py-2.5 bg-gray-800/30 border-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                            noCoinciden
                              ? "border-red-500/60 focus:ring-red-500/80"
                              : "border-gray-600/30 focus:ring-sky-500/80"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmarPassword(!showConfirmarPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors"
                        >
                          {showConfirmarPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                      </div>
                      {noCoinciden && (
                        <p className="text-xs text-red-400 mt-1 ml-1">Las contraseñas no coinciden</p>
                      )}
                    </div>

                    <button
                      onClick={handleCambiarPassword}
                      disabled={!puedeEnviar || isCambiando}
                      className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCambiando ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Cambiando...</span>
                        </div>
                      ) : (
                        "Cambiar Contraseña"
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
