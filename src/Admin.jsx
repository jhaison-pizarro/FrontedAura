import { Routes, Route, NavLink } from "react-router-dom";
import { useContext, useState, useRef, useEffect, createContext } from "react";
import { NombreContexto } from "./App2";
import { VoiceAgentProvider } from "./context/VoiceAgentContext";

import { Principal } from "./pages/index";
import Productos from "./pages/productos";
import { Login } from "./pages/login";
import { SignUp } from "./pages/signUp";
import Ventas from "./pages/ventas";
import { Compras } from "./pages/compras";
import Dashboards from "./pages/dashboards";
import Reservas from "./pages/reservas";
import { ReservaGrupal } from "./pages/reservaGrupal";
import Reportes from "./pages/reportes";
import Configuracion from "./pages/configuracion";
import Usuarios from "./pages/usuarios";
import Categorias from "./pages/Categorias";
import Combos from "./pages/combo";
import VoiceMicButton from "./components/VoiceMicButton";
import Pagos from "./pages/pagos";
import MiPerfil from "./pages/MiPerfil";
import AbrirCaja from "./pages/AbrirCaja";
import CerrarCaja from "./pages/CerrarCaja";
import RutaPrivada from "./components/RutaPrivada";
import { RutaConCaja } from "./components/RutaConCaja";
import { useCaja } from "./funciones/CajaContext";
import { useSucursal } from "./context/SucursalContext";
import Sucursales from "./pages/Sucursales";

import {
  Bell,
  AlignJustify,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  UserCircle,
  ShoppingCart,
  Calendar,
  Users,
  Package,
  Gift,
  Grid,
  FileText,
  BarChart3,
  Settings,
  User,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Clock,
  Wallet,
  Maximize2,
  Minimize2,
  Building,
  ChevronDown,
} from "lucide-react";

import "./App.css";
import "./index.css";
import { API_BASE_URL } from "./config";
import { buildImageUrl } from "./funciones/imageUtils";

// Context para el tema Dark/Light
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved || "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function Admin() {
  return (
    <ThemeProvider>
      <VoiceAgentProvider>
        <AdminLayout />
      </VoiceAgentProvider>
    </ThemeProvider>
  );
}

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuWidth = collapsed ? 70 : 240;

  return (
    <div className="flex h-screen bg-gray-200 dark:bg-gray-900 transition-colors duration-300">
      {/* Overlay móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MENÚ LATERAL IZQUIERDO */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: menuWidth }}
      >
        <Menu
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onClose={() => setMobileMenuOpen(false)}
        />
      </aside>

      {/* CONTENEDOR DERECHO: NAV + CONTENIDO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Nav onMenuClick={() => setMobileMenuOpen(true)} />

        {/* ÁREA DE CONTENIDO PRINCIPAL - FONDO DIFERENCIADO */}
        <main className="flex-1 overflow-auto p-1 md:p-2 bg-gray-300 dark:bg-gray-500">
          <Routes>
            {/* Index */}
            <Route
              index
              element={
                <RutaPrivada>
                  <Dashboards />
                </RutaPrivada>
              }
            />

            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas */}
            <Route
              path="/principal"
              element={
                <RutaPrivada>
                  <Principal />
                </RutaPrivada>
              }
            />

            <Route
              path="/productos"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Productos />
                </RutaPrivada>
              }
            />

            <Route
              path="/combos"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Combos />
                </RutaPrivada>
              }
            />

            <Route
              path="/categorias"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Categorias />
                </RutaPrivada>
              }
            />

            <Route
              path="/ventas"
              element={
                <RutaPrivada roles={["administrador", "vendedor"]}>
                  <RutaConCaja>
                    <Ventas />
                  </RutaConCaja>
                </RutaPrivada>
              }
            />

            <Route
              path="/compras"
              element={
                <RutaPrivada roles={["administrador"]}>
                  <Compras />
                </RutaPrivada>
              }
            />

            <Route
              path="/reservas"
              element={
                <RutaPrivada roles={["administrador", "vendedor"]}>
                  <RutaConCaja>
                    <Reservas />
                  </RutaConCaja>
                </RutaPrivada>
              }
            />

            <Route
              path="/reserva-grupal"
              element={
                <RutaPrivada roles={["administrador", "vendedor"]}>
                  <RutaConCaja>
                    <ReservaGrupal />
                  </RutaConCaja>
                </RutaPrivada>
              }
            />

            {/* CAJA */}
            <Route
              path="/caja/abrir"
              element={
                <RutaPrivada roles={["administrador", "vendedor"]}>
                  <AbrirCaja />
                </RutaPrivada>
              }
            />

            <Route
              path="/caja/cerrar"
              element={
                <RutaPrivada roles={["administrador", "vendedor"]}>
                  <CerrarCaja />
                </RutaPrivada>
              }
            />

            {/* ⭐ NUEVA RUTA: MÉTODOS DE PAGO */}
            <Route
              path="/pagos"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Pagos />
                </RutaPrivada>
              }
            />

            <Route
              path="/reportes"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Reportes />
                </RutaPrivada>
              }
            />

            <Route
              path="/dashboards"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Dashboards />
                </RutaPrivada>
              }
            />

            <Route
              path="/usuarios"
              element={
                <RutaPrivada roles={["administrador", "gerente"]}>
                  <Usuarios />
                </RutaPrivada>
              }
            />

            <Route
              path="/sucursales"
              element={
                <RutaPrivada roles={["administrador"]}>
                  <Sucursales />
                </RutaPrivada>
              }
            />

            <Route
              path="/configuracion"
              element={
                <RutaPrivada roles={["administrador"]}>
                  <Configuracion />
                </RutaPrivada>
              }
            />

            <Route
              path="/signup"
              element={
                <RutaPrivada roles={["administrador"]}>
                  <SignUp />
                </RutaPrivada>
              }
            />

            <Route
              path="/mi-perfil"
              element={
                <RutaPrivada>
                  <MiPerfil />
                </RutaPrivada>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Nav ---------------- */
function Nav({ onMenuClick }) {
  const { cerrarSesion, usuario } = useContext(NombreContexto);
  const { theme, toggleTheme } = useTheme();
  const { cajaAbierta, cajaActual, cajaDiaAnterior } = useCaja();
  const { sucursalActual, sucursales, cargarSucursales, cambiarSucursal } = useSucursal();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openSucursalMenu, setOpenSucursalMenu] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNotificaciones, setTotalNotificaciones] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const sucursalRef = useRef(null);

  // Cargar sucursales si es admin
  useEffect(() => {
    if (usuario?.perfil === "administrador") {
      cargarSucursales();
    }
  }, [usuario, cargarSucursales]);

  // Función para toggle pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
      });
    }
  };

  // Listener para detectar cambios en fullscreen (ej: presionar ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Mapeo de iconos para notificaciones
  const iconMap = {
    UserPlus: UserPlus,
    AlertTriangle: AlertTriangle,
    Calendar: Calendar,
    Clock: Clock,
  };

  // Mapeo de colores para badges
  const colorMap = {
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  // Cargar notificaciones desde el backend
  useEffect(() => {
    const fetchNotificaciones = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setNotificaciones([]);
          setTotalNotificaciones(0);
          return;
        }

        // Obtener lista de notificaciones
        const res = await fetch(`${API_BASE_URL}/notificaciones`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificaciones(data || []);
          // Calcular total sumando cantidades
          const total = (data || []).reduce((acc, n) => acc + (n.cantidad || 0), 0);
          setTotalNotificaciones(total);
        }
      } catch (err) {
        setNotificaciones([]);
        setTotalNotificaciones(0);
      }
    };
    fetchNotificaciones();
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [usuario]);

  // Cerrar menús al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpenUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
      if (sucursalRef.current && !sucursalRef.current.contains(event.target)) {
        setOpenSucursalMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 shadow-sm transition-colors duration-300">
      <div className="px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3 relative">
          {/* IZQUIERDA: Menu móvil */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <AlignJustify className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          {/* Selector de Sucursal (solo admin) */}
          {usuario?.perfil === "administrador" && sucursales.length > 1 ? (
            <div className="relative" ref={sucursalRef}>
              <button
                onClick={() => setOpenSucursalMenu(!openSucursalMenu)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors border border-sky-200 dark:border-sky-700"
              >
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {sucursalActual?.nombre || "Sucursal"}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${openSucursalMenu ? "rotate-180" : ""}`} />
              </button>

              {openSucursalMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 overflow-hidden z-50">
                  <div className="p-2 bg-sky-600 dark:bg-sky-800">
                    <p className="text-xs font-semibold text-white">Cambiar Sucursal</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {sucursales
                      .filter((s) => s.estado === "activa")
                      .map((s) => (
                        <button
                          key={s.ID}
                          onClick={async () => {
                            const ok = await cambiarSucursal(s.ID);
                            if (ok) {
                              setOpenSucursalMenu(false);
                              window.location.reload();
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                            sucursalActual?.id === s.ID
                              ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <Building className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{s.nombre}</span>
                          {sucursalActual?.id === s.ID && (
                            <span className="ml-auto text-sky-500 text-xs">actual</span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            sucursalActual?.nombre && (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs sm:text-sm">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {sucursalActual.nombre}
                </span>
              </div>
            )
          )}

          {/* CENTRO: Asistente de voz IA */}
          <div className="flex-1 flex justify-center z-10">
            <VoiceMicButton size="lg" />
          </div>

          {/* DERECHA: Tema, Notificaciones, Usuario */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Toggle tema */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={theme === "light" ? "Modo oscuro" : "Modo claro"}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              ) : (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              )}
            </button>

            {/* Toggle Pantalla Completa - oculto en móvil */}
            <button
              onClick={toggleFullscreen}
              className={`hidden sm:block p-2 rounded-md transition-all duration-300 ${
                isFullscreen
                  ? "bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* Indicador de Caja */}
            {cajaDiaAnterior ? (
              <NavLink
                to="/caja/cerrar"
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors animate-pulse shadow-sm"
                title="Caja de dia anterior - Debe cerrarla"
              >
                <Wallet className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Cerrar Caja</span>
              </NavLink>
            ) : cajaAbierta ? (
              <NavLink
                to="/caja/cerrar"
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors shadow-sm"
                title="Caja abierta - Click para cerrar"
              >
                <Wallet className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Caja</span>
              </NavLink>
            ) : (
              <NavLink
                to="/caja/abrir"
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors animate-pulse shadow-sm"
                title="Debe abrir caja"
              >
                <Wallet className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Caja</span>
              </NavLink>
            )}

            {/* Notificaciones - dropdown con lista */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setOpenNotifications(!openNotifications)}
                className="relative p-1.5 sm:p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={totalNotificaciones > 0 ? `${totalNotificaciones} notificaciones` : "Sin notificaciones"}
              >
                <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${totalNotificaciones > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`} />
                {totalNotificaciones > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {totalNotificaciones > 99 ? "99+" : totalNotificaciones}
                  </span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              {openNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 overflow-hidden z-50">
                  {/* Header */}
                  <div className="p-3 bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-white" />
                      <span className="font-semibold text-white text-sm">Notificaciones</span>
                    </div>
                    {totalNotificaciones > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {totalNotificaciones}
                      </span>
                    )}
                  </div>

                  {/* Lista de notificaciones */}
                  <div className="max-h-80 overflow-y-auto">
                    {notificaciones.length > 0 ? (
                      <>
                        {notificaciones.map((notif) => {
                          const IconComponent = iconMap[notif.icono] || Bell;
                          const colorClass = colorMap[notif.color] || colorMap.blue;
                          return (
                            <NavLink
                              key={notif.id}
                              to={notif.enlace}
                              onClick={() => setOpenNotifications(false)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 transition-colors"
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {notif.titulo}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {notif.mensaje}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${colorClass}`}>
                                  {notif.cantidad}
                                </span>
                              </div>
                            </NavLink>
                          );
                        })}
                      </>
                    ) : (
                      <div className="p-6 text-center">
                        <Bell className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No hay notificaciones pendientes
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Todo está al día
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Usuario */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setOpenUserMenu(!openUserMenu)}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {usuario?.imagenUrl ? (
                  <img
                    src={buildImageUrl(usuario.imagenUrl)}
                    alt="Usuario"
                    className="w-8 h-8 rounded-full object-cover border-2 border-slate-500 dark:border-gray-400"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>

              {openUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 overflow-hidden z-50">
                  <div className="p-3 bg-slate-700 dark:bg-slate-800">
                    <p className="font-medium text-white text-sm">
                      {usuario?.nombre}
                    </p>
                    <p className="text-xs text-gray-300">
                      Rol: {usuario?.perfil}
                    </p>
                  </div>
                  <div className="p-2">
                    <NavLink
                      to="/mi-perfil"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-200"
                      onClick={() => setOpenUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Mi perfil</span>
                    </NavLink>
                    <button
                      onClick={() => {
                        cerrarSesion();
                        setOpenUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </nav>
  );
}

/* ---------------- Menu ---------------- */
function Menu({ collapsed, setCollapsed, onClose }) {
  const { usuario } = useContext(NombreContexto);
  const { cajaAbierta, cajaDiaAnterior } = useCaja();
  const { sucursalActual } = useSucursal();
  const [empresaConfig, setEmpresaConfig] = useState(null);

  // FETCH CONFIGURACIÓN DE LA EMPRESA
  useEffect(() => {
    fetch(`${API_BASE_URL}/configuracion`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEmpresaConfig(data))
      .catch(() => setEmpresaConfig(null));
  }, []);

  const hasRole = (roles = []) => {
    if (!usuario) return false;
    const userRole = (usuario.perfil || "").toString().toLowerCase();
    return roles.map((r) => r.toLowerCase()).includes(userRole);
  };

  const menuItems = [
    {
      path: cajaDiaAnterior ? "/caja/cerrar" : cajaAbierta ? "/caja/cerrar" : "/caja/abrir",
      icon: Wallet,
      label: cajaDiaAnterior ? "Cerrar Caja (Pendiente)" : cajaAbierta ? "Cerrar Caja" : "Abrir Caja",
      roles: ["administrador", "vendedor"],
      color: cajaDiaAnterior ? "text-red-600" : cajaAbierta ? "text-green-600" : "text-blue-600",
    },
    {
      path: "/ventas",
      icon: ShoppingCart,
      label: "Ventas",
      roles: ["administrador", "vendedor"],
      color: "text-blue-600",
    },
    {
      path: "/reservas",
      icon: Calendar,
      label: "Reservas",
      roles: ["administrador", "vendedor"],
      color: "text-green-600",
    },
    {
      path: "/reserva-grupal",
      icon: Users,
      label: "Reserva Grupal",
      roles: ["administrador", "vendedor"],
      color: "text-purple-600",
    },
    {
      path: "/productos",
      icon: Package,
      label: "Productos",
      roles: ["administrador", "gerente"],
      color: "text-orange-600",
    },
    {
      path: "/combos",
      icon: Gift,
      label: "Combos",
      roles: ["administrador", "gerente"],
      color: "text-pink-600",
    },
    {
      path: "/categorias",
      icon: Grid,
      label: "Categorías",
      roles: ["administrador", "gerente"],
      color: "text-indigo-600",
    },
    {
      path: "/usuarios",
      icon: User,
      label: "Usuarios",
      roles: ["administrador", "gerente"],
      color: "text-teal-600",
    },
    // ⭐ NUEVO: MÉTODOS DE PAGO
    {
      path: "/pagos",
      icon: DollarSign,
      label: "Métodos de Pago",
      roles: ["administrador", "gerente"],
      color: "text-emerald-600",
    },
    {
      path: "/reportes",
      icon: FileText,
      label: "Reportes",
      roles: ["administrador", "gerente"],
      color: "text-yellow-600",
    },
    {
      path: "/dashboards",
      icon: BarChart3,
      label: "Dashboard",
      roles: ["administrador", "gerente"],
      color: "text-cyan-600",
    },
    {
      path: "/sucursales",
      icon: Building,
      label: "Sucursales",
      roles: ["administrador"],
      color: "text-blue-600",
    },
    {
      path: "/configuracion",
      icon: Settings,
      label: "Configuración",
      roles: ["administrador"],
      color: "text-gray-600",
    },
  ];

  const filteredItems = menuItems.filter(
    (item) => !item.roles || item.roles.length === 0 || hasRole(item.roles)
  );

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 flex flex-col transition-colors duration-300">
      {/* HEADER CON LOGO REDONDO Y NOMBRE ABAJO */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-600 bg-slate-200 dark:bg-slate-700">
        {!collapsed ? (
          <div className="flex flex-col items-center text-center">
            {/* LOGO EN CÍRCULO */}
            {empresaConfig?.logo ? (
              <div className="w-16 h-16 rounded-full bg-white shadow-md p-1 mb-2 flex items-center justify-center overflow-hidden">
                <img
                  src={buildImageUrl(empresaConfig.logo)}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-600 shadow-md flex items-center justify-center mb-2">
                <span className="text-white font-bold text-xl">S</span>
              </div>
            )}
            {/* NOMBRE DE LA EMPRESA / SUCURSAL */}
            <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
              {empresaConfig?.nombre_empresa || "Sistema Admin"}
            </h1>
            {sucursalActual?.nombre && (
              <p className="text-base font-extrabold text-blue-700 dark:text-blue-300 mt-1 tracking-wider uppercase bg-blue-100 dark:bg-blue-900/40 px-3 py-0.5 rounded-md border border-blue-300 dark:border-blue-600 shadow-sm">
                {sucursalActual.nombre}
              </p>
            )}
            {empresaConfig?.lema && (
              <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                {empresaConfig.lema}
              </p>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            {empresaConfig?.logo ? (
              <div className="w-10 h-10 rounded-full bg-white shadow-md p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={buildImageUrl(empresaConfig.logo)}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-600 shadow-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTÓN COLAPSAR - DISEÑO MODERNO */}
      {/* BOTÓN COLAPSAR - Pequeño y llamativo */}
      <div className={`py-2 flex ${collapsed ? "justify-center" : "justify-end pr-2"}`}>
        <button
          onClick={() => {
            setCollapsed(!collapsed);
            onClose();
          }}
          className="
            w-8 h-8 rounded-full
            bg-gradient-to-br from-orange-400 to-orange-600
            hover:from-orange-500 hover:to-orange-700
            shadow-lg hover:shadow-xl
            border-2 border-orange-300
            transition-all duration-300
            hover:scale-110 active:scale-95
            flex items-center justify-center
          "
          title={collapsed ? "Expandir menú" : "Contraer menú"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-white" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* ITEMS DEL MENÚ - EFECTO HOVER IDÉNTICO Y LLAMATIVO */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1.5 lg:space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-2 px-3 py-3 lg:py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-slate-500 to-slate-400 dark:from-slate-600 dark:to-slate-800 text-white shadow-lg transform scale-[1.02]"
                    : "text-gray-800 dark:text-gray-200 hover:bg-gradient-to-r hover:from-gray-200 hover:to-slate-200 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:shadow-md hover:scale-[1.02] hover:translate-x-1"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : `${item.color} group-hover:scale-110 group-hover:rotate-3`
                    }`}
                  />
                  {!collapsed && (
                    <span className="font-medium truncate">{item.label}</span>
                  )}
                  {!collapsed && !isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* FOOTER */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-300 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            © 2025 Sistema Admin
          </p>
        </div>
      )}
    </div>
  );
}

export default Admin;
