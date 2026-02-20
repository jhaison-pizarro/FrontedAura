import { useState, useEffect, useContext } from "react";
import { FaEye, FaEyeSlash, FaUser, FaLock } from "react-icons/fa";
import { Mail, X, Clock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { setToken, setUsuario, API_BASE_URL } from "../funciones/auth";
import { NombreContexto } from "../App2";
import { buildImageUrl } from "../funciones/imageUtils";
import { useNavigate } from "react-router-dom";

// Fondos
import fondo1 from "../assets/DALL·E 2024-09-26 18.10.00 - A stylish and elegant background image for a clothing store specializing in evening gowns and formal dresses. The design features a luxurious setting .webp";
import fondo2 from "../assets/fondo.webp";
import fondo3 from "../assets/Designer.jpeg";
import fondo4 from "../assets/Designer (1).jpeg";
import fondo5 from "../assets/Designer (2).jpeg";
import fondo6 from "../assets/Designer (3).jpeg";
import fondo7 from "../assets/Designer (4).jpeg";
import fondo8 from "../assets/fondo1.png";
import fondo9 from "../assets/imasdd.webp";

const fondosLogin = [fondo1, fondo2, fondo3, fondo4, fondo5, fondo6, fondo7, fondo8, fondo9];

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
        toast.error(result.error || "Error en el login");
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

    try {
      const res = await fetch(`${API_BASE_URL}/auth/solicitar-recuperacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Código enviado a su correo");
        setPaso(2);
        setTiempoRestante(120);
      } else {
        toast.error(result.error || result.mensaje || "Error al enviar código");
      }
    } catch (error) {
      toast.error("Error de conexión");
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

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verificar-codigo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacion, codigo }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Código verificado correctamente");
        setPaso(3);
      } else {
        toast.error(result.error || result.mensaje || "Código incorrecto o expirado");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleCambiarPassword = async () => {
    if (!nuevaPassword || !confirmarPassword) {
      toast.error("Complete todos los campos");
      return;
    }

    if (nuevaPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

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
        toast.success("Contraseña cambiada exitosamente");
        setShowRecuperacion(false);
        setPaso(1);
        setEmailRecuperacion("");
        setCodigo("");
        setNuevaPassword("");
        setConfirmarPassword("");
        setTiempoRestante(0);
      } else {
        toast.error(result.error || result.mensaje || "Error al cambiar contraseña");
      }
    } catch (error) {
      toast.error("Error de conexión");
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-900">
      {/* Fondos rotativos - con z-index para asegurar crossfade sin parpadeo */}
      {fondosLogin.map((fondo, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-2000 ${
            index === fondoActual ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          style={{
            backgroundImage: `url(${fondo})`,
            willChange: 'opacity'
          }}
        />
      ))}

      {/* Overlay semi-transparente oscuro */}
      <div className="absolute inset-0 bg-black/20 z-20"></div>

      {/* Tarjeta de Login */}
      <div className="relative w-full max-w-[380px] bg-gray-900/30 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden z-30">
        {/* Header con logo */}
        <div className="bg-gradient-to-r from-gray-800/25 via-gray-700/25 to-gray-800/25 p-6 text-center border-b border-gray-600/20">
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
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                <FaUser size={16} />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                className="peer w-full pl-10 pr-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent transition-all"
              />
              <label
                htmlFor="email"
                className="absolute left-10 top-2.5 text-gray-300 text-sm transition-all duration-200
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
                peer-focus:top-0 peer-focus:text-xs peer-focus:text-sky-400 peer-focus:bg-gray-900/30 peer-focus:px-1
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-sky-400 peer-[:not(:placeholder-shown)]:bg-gray-900/30 peer-[:not(:placeholder-shown)]:px-1"
              >
                Correo Electrónico
              </label>
            </div>

            {/* Input Contraseña */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80 z-10">
                <FaLock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                className="peer w-full pl-10 pr-11 py-2.5 bg-gray-800/60 border-2 border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent transition-all"
              />
              <label
                htmlFor="password"
                className="absolute left-10 top-2.5 text-gray-300 text-sm transition-all duration-200
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm
                peer-focus:top-0 peer-focus:text-xs peer-focus:text-sky-400 peer-focus:bg-gray-900/30 peer-focus:px-1
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-sky-400 peer-[:not(:placeholder-shown)]:bg-gray-900/30 peer-[:not(:placeholder-shown)]:px-1"
              >
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/80 hover:text-sky-300 transition-colors z-10"
              >
                {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
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
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Enviar Código
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
                      className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Verificar
                    </button>
                  </div>
                </div>
              )}

              {paso === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Ingrese su nueva contraseña
                  </p>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                      <FaLock size={16} />
                    </div>
                    <input
                      type="password"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="Nueva contraseña"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80">
                      <FaLock size={16} />
                    </div>
                    <input
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      placeholder="Confirmar contraseña"
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-800/30 border-2 border-gray-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleCambiarPassword}
                    className="w-full py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
