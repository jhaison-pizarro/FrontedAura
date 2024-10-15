import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Login } from "./pages/login.jsx";
import { SignUp } from "./pages/signUp.jsx";
import { Productos } from "./pages/productos.jsx";
import { App2 } from "./App2.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App2></App2>
  </StrictMode>
);
