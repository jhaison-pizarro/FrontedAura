import React, { createContext, useState } from "react";
import Admin from "./App";
import { Login } from "./pages/login";

export const NombreContexto = createContext();

export function App2() {
  const [usuario, setUsuario] = useState(null);
  const iniciarSesion = () => {
    //request done aqui hacemos la peticiones fetch para ontener el e usuario
    setUsuario({
      id: 1,
      name: "jhaison",
      perfil: "administrador",
    });
    console.log(usuario);
  };
  const cerrarSesion = () => {
    setUsuario(null);
    console.log(usuario);
  };
  return (
    <NombreContexto.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {usuario ? <Admin></Admin> : <Login></Login>}
    </NombreContexto.Provider>
  );
}
