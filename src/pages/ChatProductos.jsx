import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchAuth } from "../funciones/auth";
import { comprimirImagen } from "../funciones/funciones";
import { API_BASE_URL, WS_BASE_URL } from "../config";
import { buildImageUrl } from "../funciones/imageUtils";

// Componente ChatMCP mejorado (tu componente existente con mejoras)
function ChatMCP({ categoriaId, categoriaNombre, onProductoCreado }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Desconectado");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [foto, setFoto] = useState(null);

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Conexión WebSocket
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("Conectado");
    ws.onmessage = (event) => {
      let messageText = event.data;
      messageText = messageText.replace(/[\/,]/g, " ");

      // Verificar si se creó un producto
      if (
        messageText.includes("Producto creado") ||
        messageText.includes("creado exitosamente") ||
        messageText.includes("ha sido creado")
      ) {
        onProductoCreado?.();
      }

      setMessages((prev) => [
        ...prev,
        { type: "bot", text: messageText, timestamp: Date.now() },
      ]);

      // Text-to-speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.lang = "es-PE";
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };
    ws.onclose = () => setStatus("Desconectado");
    ws.onerror = () => setStatus("Error");

    return () => ws.close();
  }, [onProductoCreado]);

  // Speech-to-Text
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "es-PE";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscriptRef.current += transcript;
        else interim += transcript;
      }
      setInput(finalTranscriptRef.current + interim);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const sendMessage = () => {
    if (wsRef.current && input.trim() !== "") {
      const payload = JSON.stringify({
        text: input,
        categoriaId: categoriaId,
        foto: foto || null,
        accion: "crear_producto",
      });

      wsRef.current.send(payload);

      setMessages((prev) => [
        ...prev,
        { type: "user", text: input, timestamp: Date.now() },
      ]);
      finalTranscriptRef.current = "";
      setInput("");
      setFoto(null);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col lg:flex-row overflow-hidden max-h-[400px] rounded-lg">
      {/* Panel Izquierdo - Control de Voz */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-6 relative flex-1">
        {/* Patrón de puntos de fondo */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, #60a5fa 2px, transparent 2px), radial-gradient(circle at 75% 75%, #34d399 2px, transparent 2px)",
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>

        {/* Estado de conexión */}
        <div className="mb-4 text-center z-10">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
              status === "Conectado"
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                : status === "Error"
                ? "bg-red-500/20 border-red-400/50 text-red-300"
                : "bg-amber-500/20 border-amber-400/50 text-amber-300"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full mr-2 ${
                status === "Conectado"
                  ? "bg-emerald-400 animate-pulse"
                  : status === "Error"
                  ? "bg-red-400"
                  : "bg-amber-400"
              }`}
            ></div>
            {status}
          </div>
        </div>

        {/* Botón principal de micrófono */}
        <div className="relative z-10 mb-4">
          {listening && (
            <>
              <div className="absolute inset-0 rounded-full animate-pulse">
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping"></div>
                <div
                  className="absolute inset-0 rounded-full border border-blue-400/20 animate-ping delay-100"
                  style={{ transform: "scale(1.3)" }}
                ></div>
              </div>
            </>
          )}

          <button
            onClick={listening ? stopListening : startListening}
            className={`relative w-24 h-24 lg:w-28 lg:h-28 rounded-full backdrop-blur-sm border-2 transition-all duration-300 group ${
              listening
                ? "bg-red-500/30 border-red-400/70 shadow-lg shadow-red-500/50 hover:bg-red-500/40"
                : "bg-blue-500/30 border-blue-400/70 shadow-lg shadow-blue-500/50 hover:bg-blue-500/40 hover:scale-105"
            }`}
          >
            <div className="text-3xl lg:text-4xl">
              {listening ? "🔴" : "🎙️"}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {listening ? "DETENER" : "HABLAR"}
            </div>
          </button>
        </div>

        {/* Visualizador de audio compacto */}
        {listening && (
          <div className="flex items-center justify-center space-x-1 mb-3 z-10">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-gradient-to-t from-blue-400 to-blue-600 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 15 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.8s",
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Input de texto compacto */}
        <div className="w-full max-w-xs z-10">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 text-sm"
              placeholder="Describe el producto..."
            />
            <button
              onClick={sendMessage}
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg text-sm"
            >
              ➤
            </button>
          </div>

          {/* Upload foto */}
          <label className="w-full cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors">
            📷 {foto ? "Foto lista" : "Subir foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
          </label>

          {/* Preview foto */}
          {foto && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={foto}
                alt="preview"
                className="w-12 h-12 object-cover rounded-lg border border-gray-700"
              />
              <span className="text-xs text-gray-300">📸 Imagen lista</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho - Chat */}
      <div className="w-full lg:w-1/2 bg-black/40 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col relative flex-1">
        {/* Asistente flotante en esquina */}
        <div className="absolute top-3 right-3 z-20">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg ${
              speaking ? "animate-bounce ring-2 ring-emerald-400/50" : ""
            }`}
          >
            <span className="text-sm">🤖</span>
          </div>
          {speaking && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>
            </div>
          )}
        </div>

        {/* Header compacto */}
        <div className="p-3 lg:p-4 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              Chat con mi Asistente
            </h2>
            <div className="flex items-center text-xs text-gray-400">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              Creando para: {categoriaNombre}
            </div>
          </div>

          {/* Botón detener asistente compacto */}
          <button
            onClick={stopSpeaking}
            disabled={!speaking}
            className={`px-3 py-1 rounded-lg font-medium transition-all duration-200 text-xs ${
              speaking
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {speaking ? "🔇 Detener" : "🤖 Silencioso"}
          </button>
        </div>

        {/* Mensajes con altura fija y scroll */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-sm">Asistente listo para crear productos</p>
              <p className="text-xs text-gray-600">
                Ejemplo: "laptop gaming precio 2500 soles stock 5"
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                {msg.type === "bot" && (
                  <div className="mr-2 mt-1">
                    <div
                      className={`w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs ${
                        speaking ? "animate-pulse" : ""
                      }`}
                    >
                      ⚡
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[80%] lg:max-w-xs px-3 py-2 rounded-2xl text-xs lg:text-sm ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      : "bg-gradient-to-r from-gray-800 to-gray-900 text-gray-200 border border-gray-700"
                  } shadow-lg`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.type === "bot" && speaking && (
                    <div className="flex space-x-1 mt-2 justify-center">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  )}
                </div>

                {msg.type === "user" && (
                  <div className="ml-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs">
                      👤
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {/* Elemento invisible para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Helper UI components
const BorderLabelInput = ({
  label,
  name,
  type = "text",
  register,
  errors,
  required = false,
  step,
  min,
  className = "",
  ...props
}) => {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 bg-blue-100 px-1 text-xs font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        step={step}
        min={min}
        className={`w-full border rounded p-2 text-sm ${className}`}
        {...props}
      />
      {errors && errors[name] && (
        <span className="text-red-500 text-xs">{errors[name].message}</span>
      )}
    </div>
  );
};

const BorderLabelTextarea = ({ label, name, className = "", ...props }) => {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 bg-blue-100 px-1 text-xs font-medium text-gray-700">
        {label}
      </label>
      <textarea
        className={`w-full border rounded p-2 text-sm resize-none ${className}`}
        rows="3"
        {...props}
      />
    </div>
  );
};

// COMPONENTE PRINCIPAL CORREGIDO
export default function ProductosGestion() {
  const API = API_BASE_URL;

  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [productos, setProductos] = useState([]);
  const [verImagen, setVerImagen] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState("");
  const [mostrarChatIA, setMostrarChatIA] = useState(false);

  const fileInputRef = useRef(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio_venta: "",
    precio_alquiler: "",
    stock: "",
    color: "",
    talla: "",
    modelo: "",
    imagen: null,
  });

  const [editarProducto, setEditarProducto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  // Fetch categorías con mejor manejo de errores
  const fetchCategorias = async () => {
    try {
      const response = await fetchAuth(`${API}/categorias`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();
      const data = res.categorias || res || [];
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Error cargando categorías: ${err.message}`);
    }
  };

  // Fetch productos con mejor manejo de errores
  const fetchProductosPorCategoria = async (categoriaId) => {
    if (!categoriaId) return;

    try {
      const response = await fetch(
        `${API}/categorias/${categoriaId}/productos`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();
      const data = res.productos || res || [];
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Error cargando productos: ${err.message}`);
      setProductos([]);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  useEffect(() => {
    if (categoriaSeleccionada) {
      const id = categoriaSeleccionada.ID || categoriaSeleccionada.id;
      fetchProductosPorCategoria(id);
    } else {
      setProductos([]);
      setMostrarChatIA(false);
    }
  }, [categoriaSeleccionada]);

  // Submit del formulario CORREGIDO
  const onSubmit = async (e) => {
    e.preventDefault();

    if (!categoriaSeleccionada) {
      toast.warning("Selecciona una categoría antes de guardar");
      return;
    }

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      toast.warning("El nombre es obligatorio");
      return;
    }

    if (!formData.precio_venta || formData.precio_venta <= 0) {
      toast.warning("El precio de venta debe ser mayor a 0");
      return;
    }

    setLoading(true);

    try {
      const categoriaId = categoriaSeleccionada.ID || categoriaSeleccionada.id;
      const formDataToSend = new FormData();

      // Agregar todos los campos del formulario
      for (const [key, value] of Object.entries(formData)) {
        if (key === "imagen" && value) {
          formDataToSend.append(key, await comprimirImagen(value));
        } else if (key !== "imagen") {
          formDataToSend.append(key, value || "");
        }
      }

      formDataToSend.append("categoria_id", categoriaId);

      let response;
      let successMessage;

      if (editarProducto) {
        // Actualizar producto existente
        const productId = editarProducto.id || editarProducto.ID;
        response = await fetchAuth(`${API}/productos/${productId}`, {
          method: "PUT",
          body: formDataToSend,
        });
        successMessage = "Producto actualizado correctamente";
      } else {
        // Crear nuevo producto
        response = await fetchAuth(`${API}/productos`, {
          method: "POST",
          body: formDataToSend,
        });
        successMessage = "Producto creado correctamente";
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      toast.success(successMessage);

      // Refrescar la lista de productos
      await fetchProductosPorCategoria(categoriaId);

      // Limpiar el formulario
      resetForm();
    } catch (err) {
      toast.error(`Error guardando producto: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reset del formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio_venta: "",
      precio_alquiler: "",
      stock: "",
      color: "",
      talla: "",
      modelo: "",
      imagen: null,
    });
    setEditarProducto(null);

    // Limpiar el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Editar producto
  const handleEditar = (p) => {
    setEditarProducto(p);
    setFormData({
      nombre: p.nombre || "",
      descripcion: p.descripcion || "",
      precio_venta: p.precio_venta || "",
      precio_alquiler: p.precio_alquiler || "",
      stock: p.stock || "",
      color: p.color || "",
      talla: p.talla || "",
      modelo: p.modelo || "",
      imagen: null, // No precargamos la imagen
    });
  };

  // Eliminar producto
  const handleEliminar = (p) => {
    setConfirmarEliminar(p);
  };

  const confirmarEliminarProducto = async () => {
    if (!confirmarEliminar) return;
    const p = confirmarEliminar;
    setConfirmarEliminar(null);
    setLoading(true);

    try {
      const productId = p.id || p.ID;
      const response = await fetchAuth(`${API}/productos/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      toast.success("Producto eliminado correctamente");

      if (categoriaSeleccionada) {
        const categoriaId =
          categoriaSeleccionada.ID || categoriaSeleccionada.id;
        await fetchProductosPorCategoria(categoriaId);
      }
    } catch (err) {
      toast.error(`Error eliminando producto: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Buscar por código de barras
  const buscarPorCodigoBarras = async (codigo) => {
    if (!codigo || !codigo.trim()) {
      toast.warning("Ingresa un código");
      return;
    }

    setLoading(true);

    try {
      const response = await fetchAuth(`${API}/productos/codigo/${codigo}`);

      if (!response.ok) {
        throw new Error("Producto no encontrado");
      }

      const res = await response.json();
      const producto = res.producto || res || null;

      if (!producto) {
        toast.warning("Producto no encontrado");
        return;
      }

      handleEditar(producto);
      toast.success(`Producto encontrado: ${producto.nombre}`);
    } catch (err) {
      toast.error("Producto no encontrado o error en la búsqueda");
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar categoría
  const onCategoriaClick = (cat) => {
    setCategoriaSeleccionada(cat);
    setMostrarModal(false);
  };

  // Callback cuando IA crea producto
  const handleProductoCreadoIA = async () => {
    if (categoriaSeleccionada) {
      const id = categoriaSeleccionada.ID || categoriaSeleccionada.id;
      await fetchProductosPorCategoria(id);
    }
  };

  // Render recursivo categorías
  function renderCategoriasList(cats = [], nivel = 0) {
    return cats.map((cat) => {
      const id = cat.ID || cat.id;
      const nombre = cat.Nombre || cat.nombre || "Sin nombre";
      const sub = cat.SubCategorias || cat.subcategorias || [];

      return (
        <div key={id} style={{ marginLeft: nivel * 12 }}>
          <div className="flex items-center justify-between p-2 border rounded bg-sky-50 mb-1">
            <div className="truncate flex items-center gap-2">
              {nivel > 0 && <span className="text-gray-400">⤷</span>}
              <span className="font-medium text-sm">{nombre}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onCategoriaClick(cat)}
                className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded"
              >
                Seleccionar
              </button>
            </div>
          </div>
          {sub.length > 0 && renderCategoriasList(sub, nivel + 1)}
        </div>
      );
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-blue-50 min-h-screen rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Gestión de Productos</h1>

      {/* Indicador de carga */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Procesando...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULARIO TRADICIONAL: 1 columna */}
        <div className="col-span-1 bg-blue-100 p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4">Formulario tradicional</h2>

          {categoriaSeleccionada ? (
            <div className="mb-4">
              <p className="text-sm bg-blue-200 p-2 rounded mb-2">
                Categoría:{" "}
                <span className="font-semibold">
                  {categoriaSeleccionada.nombre || categoriaSeleccionada.Nombre}
                </span>
              </p>

              {/* BOTÓN PARA ACTIVAR CHAT IA - Solo aparece si hay categoría */}
              <button
                onClick={() => setMostrarChatIA(!mostrarChatIA)}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg font-bold text-white transition-all duration-300 mb-3 ${
                  mostrarChatIA
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {mostrarChatIA
                  ? "🔴 Cerrar Chat IA"
                  : "🤖 Crear Producto con IA"}
              </button>
            </div>
          ) : (
            <p className="text-sm mb-3 text-red-600">
              No hay categoría seleccionada
            </p>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMostrarModal(true)}
              disabled={loading}
              className={`px-3 py-1 bg-blue-400 hover:bg-blue-500 text-white rounded ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Seleccionar Categoría
            </button>

            <button
              onClick={() => setMostrarScanner(true)}
              disabled={loading}
              className={`px-3 py-1 bg-green-400 hover:bg-green-500 text-white rounded ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              📱 Escanear / Buscar
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <BorderLabelInput
              label="Nombre *"
              name="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              required
              disabled={loading}
            />

            <BorderLabelTextarea
              label="Descripción"
              name="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              disabled={loading}
            />

            <div className="grid grid-cols-2 gap-3">
              <BorderLabelInput
                label="Precio Venta *"
                name="precio_venta"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.precio_venta}
                onChange={(e) =>
                  setFormData({ ...formData, precio_venta: e.target.value })
                }
                required
                disabled={loading}
              />
              <BorderLabelInput
                label="Precio Alquiler"
                name="precio_alquiler"
                type="number"
                step="0.01"
                min="0"
                value={formData.precio_alquiler}
                onChange={(e) =>
                  setFormData({ ...formData, precio_alquiler: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <BorderLabelInput
                label="Stock *"
                name="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                required
                disabled={loading}
              />
              <BorderLabelInput
                label="Talla"
                name="talla"
                value={formData.talla}
                onChange={(e) =>
                  setFormData({ ...formData, talla: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <BorderLabelInput
                label="Color"
                name="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                disabled={loading}
              />
              <BorderLabelInput
                label="Modelo"
                name="modelo"
                value={formData.modelo}
                onChange={(e) =>
                  setFormData({ ...formData, modelo: e.target.value })
                }
                disabled={loading}
              />
            </div>

            {/* Imagen + tomar foto */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-blue-100 px-1 text-xs font-medium text-gray-700">
                Imagen
              </label>

              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, imagen: e.target.files[0] })
                  }
                  ref={fileInputRef}
                  className="w-full border rounded p-2 text-sm"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current && !loading) {
                      fileInputRef.current.setAttribute(
                        "capture",
                        "environment"
                      );
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={loading}
                  className={`px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  📷
                </button>
              </div>

              {formData.imagen && (
                <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✓ Imagen seleccionada: {formData.imagen.name}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={loading || !categoriaSeleccionada}
                className={`flex-1 py-2 text-white rounded font-medium ${
                  loading || !categoriaSeleccionada
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loading
                  ? "Guardando..."
                  : editarProducto
                  ? "Actualizar"
                  : "Guardar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className={`flex-1 py-2 text-white rounded ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                Limpiar
              </button>
            </div>

            {editarProducto && (
              <div className="text-xs bg-yellow-50 border border-yellow-200 p-2 rounded">
                📝 Editando: <strong>{editarProducto.nombre}</strong>
              </div>
            )}
          </form>
        </div>

        {/* LISTA + CHAT IA: 2 columnas */}
        <div className="col-span-2 space-y-4">
          {/* CHAT IA - Solo se muestra cuando está activado Y hay categoría */}
          {mostrarChatIA && categoriaSeleccionada && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Crear Producto con Inteligencia Artificial
                </h3>
                <button
                  onClick={() => setMostrarChatIA(false)}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                >
                  Cerrar IA
                </button>
              </div>

              <ChatMCP
                categoriaId={
                  categoriaSeleccionada.ID || categoriaSeleccionada.id
                }
                categoriaNombre={
                  categoriaSeleccionada.nombre || categoriaSeleccionada.Nombre
                }
                onProductoCreado={handleProductoCreadoIA}
              />
            </div>
          )}

          {/* LISTA DE PRODUCTOS */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">Lista de Productos</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarModal(true)}
                  disabled={loading}
                  className={`px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Seleccionar Categoría
                </button>
                <button
                  onClick={async () => {
                    if (categoriaSeleccionada && !loading) {
                      const id =
                        categoriaSeleccionada.ID || categoriaSeleccionada.id;
                      await fetchProductosPorCategoria(id);
                    }
                  }}
                  disabled={loading || !categoriaSeleccionada}
                  className={`px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded ${
                    loading || !categoriaSeleccionada
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {loading ? "⟳" : "🔄"} Actualizar
                </button>
              </div>
            </div>

            {!categoriaSeleccionada ? (
              <p className="text-center text-gray-700 py-6">
                Selecciona una categoría para ver sus productos
              </p>
            ) : productos.length === 0 ? (
              <div className="text-center text-gray-700 py-8">
                <div className="text-4xl mb-3">📦</div>
                <p className="mb-2">
                  No hay productos en{" "}
                  {categoriaSeleccionada.nombre || categoriaSeleccionada.Nombre}
                </p>
                <p className="text-sm text-gray-500">
                  {mostrarChatIA
                    ? "Usa el chat IA arriba para crear el primero"
                    : "Activa el chat IA para crear productos"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded border">
                <div className="mb-2 p-3 bg-gray-50 border-b">
                  <p className="text-sm text-gray-600">
                    Mostrando <strong>{productos.length}</strong> productos de:{" "}
                    <span className="font-semibold text-blue-600">
                      {categoriaSeleccionada.nombre ||
                        categoriaSeleccionada.Nombre}
                    </span>
                    {mostrarChatIA && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        🤖 Chat IA activo
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-12 bg-gray-200 p-2 font-bold text-sm sticky top-0">
                  <div className="col-span-4">Producto</div>
                  <div className="col-span-2">P. Venta</div>
                  <div className="col-span-2">P. Alquiler</div>
                  <div className="col-span-1">Stock</div>
                  <div className="col-span-3 text-center">Acciones</div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {productos.map((p, idx) => (
                    <div
                      key={p.id || p.ID}
                      className={`grid grid-cols-12 p-2 items-center gap-2 text-sm border-b transition-all duration-200 hover:bg-blue-50 ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } ${
                        editarProducto &&
                        (editarProducto.id === p.id ||
                          editarProducto.ID === p.ID)
                          ? "ring-2 ring-yellow-300 bg-yellow-50"
                          : ""
                      }`}
                    >
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          {p.imagen ? (
                            <img
                              src={buildImageUrl(p.imagen)}
                              alt={p.nombre}
                              className="w-12 h-12 object-cover rounded border shadow-sm"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500"
                            style={{ display: p.imagen ? "none" : "flex" }}
                          >
                            📦
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-gray-800">
                              {p.nombre}
                            </p>
                            <div className="flex gap-2 text-xs text-gray-500">
                              {p.modelo && <span>Modelo: {p.modelo}</span>}
                              {p.color && <span>• {p.color}</span>}
                              {p.talla && <span>• Talla {p.talla}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 text-green-600 font-medium">
                        S/ {Number(p.precio_venta ?? 0).toFixed(2)}
                      </div>

                      <div className="col-span-2 text-blue-600 font-medium">
                        S/ {Number(p.precio_alquiler ?? 0).toFixed(2)}
                      </div>

                      <div className="col-span-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            p.stock > 10
                              ? "bg-green-100 text-green-800"
                              : p.stock > 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.stock ?? 0}
                        </span>
                      </div>

                      <div className="col-span-3 flex justify-center gap-1">
                        {p.imagen && (
                          <button
                            onClick={() =>
                              setVerImagen(buildImageUrl(p.imagen))
                            }
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs transition-colors"
                            title="Ver imagen"
                            disabled={loading}
                          >
                            📷
                          </button>
                        )}

                        <button
                          onClick={() => handleEditar(p)}
                          disabled={loading}
                          className={`px-2 py-1 text-white rounded text-xs transition-colors ${
                            loading
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-yellow-500 hover:bg-yellow-600"
                          }`}
                          title="Editar"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => handleEliminar(p)}
                          disabled={loading}
                          className={`px-2 py-1 text-white rounded text-xs transition-colors ${
                            loading
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-red-500 hover:bg-red-600"
                          }`}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALES */}

      {/* MODAL: seleccionar categoría */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Selecciona una categoría</h3>
              <button
                onClick={() => setMostrarModal(false)}
                className="px-3 py-1 rounded border hover:bg-gray-50"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-2">
              {categorias.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Cargando categorías...
                </p>
              ) : (
                renderCategoriasList(categorias)
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: scanner / buscar por código */}
      {mostrarScanner && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold mb-3">
              Buscar por Código de Barras
            </h3>

            <div className="relative mb-4">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-700">
                Código de Barras
              </label>
              <input
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                placeholder="Ingresa o escanea el código"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    buscarPorCodigoBarras(codigoBarras);
                    setMostrarScanner(false);
                    setCodigoBarras("");
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!loading) {
                    await buscarPorCodigoBarras(codigoBarras);
                    setMostrarScanner(false);
                    setCodigoBarras("");
                  }
                }}
                disabled={loading || !codigoBarras.trim()}
                className={`flex-1 py-2 text-white rounded font-medium ${
                  loading || !codigoBarras.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {loading ? "Buscando..." : "🔍 Buscar"}
              </button>

              <button
                onClick={() => {
                  setMostrarScanner(false);
                  setCodigoBarras("");
                }}
                disabled={loading}
                className={`px-4 py-2 text-white rounded ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ver imagen */}
      {verImagen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50 p-4">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <img
              src={verImagen}
              alt="Producto"
              className="max-h-96 mx-auto w-full object-contain rounded"
              onError={(e) => {
                e.target.parentNode.innerHTML =
                  '<div class="text-center text-gray-500 py-8">❌ Error cargando imagen</div>';
              }}
            />
            <div className="flex justify-between items-center mt-3 gap-2">
              <a
                href={verImagen}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm transition-colors"
              >
                🔗 Abrir en nueva pestaña
              </a>
              <button
                onClick={() => setVerImagen(null)}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar producto */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Eliminar producto?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Se eliminará "<strong>{confirmarEliminar.nombre || "este producto"}</strong>". Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmarEliminar(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarProducto}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
