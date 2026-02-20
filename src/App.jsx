import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import "./App.css";
import "./index.css";
import { Principal } from "./pages/index";
import Productos from "./pages/productos";
import { Login } from "./pages/login";
import { SignUp } from "./pages/signUp";
import Ventas from "./pages/ventas";
import { Compras } from "./pages/compras";
import Dashboards from "./pages/dashboards";
import Reservas from "./pages/reservas";
import Reportes from "./pages/reportes";
import Configuracion from "./pages/configuracion";
import Usuarios from "./pages/usuarios";

//iconos de react icons
import { IoIosNotificationsOutline } from "react-icons/io";
import { MdOutlineShoppingCart } from "react-icons/md";
import { FcShop } from "react-icons/fc";
import { SiSimpleanalytics } from "react-icons/si";
import { IoSettingsOutline } from "react-icons/io5";
import { CgProductHunt } from "react-icons/cg";
import { LuUserCog } from "react-icons/lu";
import { GiAmpleDress } from "react-icons/gi";
import { TbReport } from "react-icons/tb";
import { IoSearchSharp } from "react-icons/io5";
// para el contexto
import { useContext } from "react";
import { NombreContexto } from "./App2";

function Admin() {
  return (
    <div className="container">
      {/* Menú a la izquierda */}

      {/* Barra de navegación en la parte superior derecha */}

      {/* Contenido principal a la derecha, debajo del nav */}

      <BrowserRouter>
        <Nav></Nav>

        <div className="menu">
          <Menu />
        </div>
        <div className="content">
          <Routes>
            <Route index element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/principal" element={<Principal />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default Admin;
function Nav() {
  const { cerrarSesion } = useContext(NombreContexto);
  return (
    <nav className="nav">
      <ul className="grid-flow-col items-center">
        <div className="flex items-center">
          <input
            className="w-64 border-2 border-blue-400 rounded-tl-lg rounded-bl-lg"
            type="text"
          />
          <button>
            <IoSearchSharp className="bg-blue-300 h-7 rounded-r-lg border-2 border-blue-300 hover:bg-slate-500" />{" "}
          </button>
        </div>
        <li>
          <IoIosNotificationsOutline />
        </li>
        <li>
          {" "}
          <Link onClick={cerrarSesion}> Cerrar Sesion</Link>
        </li>

        <li>
          {" "}
          <Link to="signup">Registro</Link>
        </li>
      </ul>
    </nav>
  );
}
function Menu() {
  const est =
    "flex items-center  gap-3 font-bold text-blue-400: hover:bg-gradient-to-r from-red-500 to-red-300 text-white p-2 rounded-xl";
  return (
    <aside className="menu-card grid-flow-row gap-2 overflow-y-auto">
      <img
        src="https://res.cloudinary.com/pizarro/image/upload/v1726209780/perfil-del-usuario_qllrwv.png"
        alt="Usuario"
        class="imagen-usuario"
      />
      <h1>user</h1>
      <ul className="menu-list">
        <hr />
        <li>
          {" "}
          <Link className={est} to="/ventas">
            <MdOutlineShoppingCart /> <h1> Ventas</h1>{" "}
          </Link>{" "}
        </li>
        <li>
          <Link className={est} to={"compras"}>
            <FcShop /> Compras
          </Link>
        </li>
        <li>
          {" "}
          <Link className={est} to="reservas">
            <GiAmpleDress /> Reservas
          </Link>
        </li>
        <li>
          {" "}
          <Link className={est} to="productos">
            <CgProductHunt /> Productos
          </Link>
        </li>
        <li>
          {" "}
          <Link className={est} to={"usuarios"}>
            <LuUserCog /> usuarios{" "}
          </Link>
        </li>
        <li>
          {" "}
          <Link className={est} to="reportes">
            <TbReport /> Reportes
          </Link>
        </li>
        <li>
          <Link className={est} to="/dashboards">
            <SiSimpleanalytics /> Dashboard
          </Link>
        </li>
        <li>
          <Link className={est} to="configuracion">
            <IoSettingsOutline /> Configuración
          </Link>
        </li>
      </ul>
    </aside>
  );
}
