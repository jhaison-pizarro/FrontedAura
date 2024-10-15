import React, { useState } from "react";
import "../styles/login.css";
// para el contexto
import { useContext } from "react";
import { NombreContexto } from "../App2";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    // Aquí puedes manejar la lógica de autenticación
    console.log("Login details", { email, password });
  };
  const { iniciarSesion } = useContext(NombreContexto);

  return (
    <div
      className="pb-96 flex justify-center"
      style={{
        backgroundImage: "url(src/assets/image.png)",
        //backgroundSize: "cover",
        // backgroundPosition: "center",
        backgroundSize: "contain", // Ajusta la imagen para que quepa dentro sin recortarse
        // backgroundPosition: "center", // Centra la imagen
        //backgroundRepeat: "no-repeat", // Evita que la imagen se repita
      }}
    >
      <div className="login-box  mt-16">
        <h2 className="login-title"> BIENVENIDO!</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Correo Electronico</label>
            <input
              className="text-black"
              type="email"
              id="email"
              placeholder="ingrese su correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type={showPassword ? "text" : "password"} // Cambiar entre "text" y "password"
              className="text-black"
              id="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute mt-2 bg-slate-400 rounded-3xl bg-ye"
            >
              {showPassword ? "🐵" : "🙈"}
            </button>
          </div>

          <button
            type="submit"
            className="login-button "
            onClick={iniciarSesion}
          >
            Iniciar Sesion
          </button>
        </form>
      </div>
    </div>
  );
}
