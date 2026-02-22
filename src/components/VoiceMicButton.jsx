import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useVoiceAgent } from "../context/VoiceAgentContext";
import { WS_BASE_URL } from "../config";

export default function VoiceMicButton({ categoriaId, accion, onProductoCreado, tieneImagen, size = "sm", instruccion: instruccionProp, getFormContext }) {
  const { executeAction } = useVoiceAgent();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | listening | processing | speaking
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [popupPos, setPopupPos] = useState(null); // posición fixed del popup

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const fullTranscriptRef = useRef(""); // final + interim (siempre completo)
  const listeningRef = useRef(false);
  const wrapperRef = useRef(null); // ref para calcular posición fixed del popup

  // Refs para valores usados dentro del WebSocket handler (evitar closures obsoletos)
  const executeActionRef = useRef(executeAction);
  const onProductoCreadoRef = useRef(onProductoCreado);
  const getFormContextRef = useRef(getFormContext);
  useEffect(() => { executeActionRef.current = executeAction; }, [executeAction]);
  useEffect(() => { onProductoCreadoRef.current = onProductoCreado; }, [onProductoCreado]);
  useEffect(() => { getFormContextRef.current = getFormContext; }, [getFormContext]);

  // Memoria de corto plazo: guarda texto dictado si falta categoría
  const pendingTextRef = useRef(null);

  const isLg = size === "lg";
  const isProductMode = accion === "crear_producto";
  const isClientMode = accion === "registrar_cliente";
  const isComboMode = accion === "crear_combo";
  const isCategoryMode = accion === "crear_categoria";
  const isConfigMode = accion === "crear_configuracion";
  const isPaymentMode = accion === "crear_pago";
  const isSucursalMode = accion === "crear_sucursal";

  const restriccionComun = " PROHIBIDO: navegar, cambiar de página, usar navigate, read_data, o cualquier herramienta que no sea la de este formulario. NUNCA ofrezcas navegación ni listas de funciones. NUNCA uses asteriscos, markdown ni listas. Responde en texto plano, máximo 10 palabras.";

  const instruccionDefault = isProductMode
    ? "CONTEXTO: Estás DENTRO del formulario de PRODUCTOS. Solo creas productos aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para crear productos, dicta el producto'. Si dictan datos, usa fill_product_form y responde: 'Listo, revisa y dime guardar'." + restriccionComun
    : isClientMode
    ? "CONTEXTO: Estás DENTRO del formulario de CLIENTES. Solo registras clientes aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para registrar clientes, dicta los datos'. Extrae: dni, telefono, direccion. Usa fill_client_form con los datos." + restriccionComun
    : isComboMode
    ? "CONTEXTO: Estás DENTRO del formulario de COMBOS. Solo creas combos aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para crear combos, dicta el combo'. Extrae: nombre, descripcion, precio_oferta. Usa fill_combo_form con los datos." + restriccionComun
    : isCategoryMode
    ? "CONTEXTO: Estás DENTRO del formulario de CATEGORÍAS. Solo creas categorías aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para crear categorías, dicta la categoría'. Extrae: nombre, descripcion. Usa fill_category_form con {nombre, descripcion}." + restriccionComun
    : isConfigMode
    ? "CONTEXTO: Estás DENTRO del formulario de CONFIGURACIÓN DE EMPRESA. Solo configuras la empresa aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para configurar tu empresa, dicta los datos'. Extrae: nombre_empresa, razon_social, ruc. Opcionales: correo, sitio_web, lema. Usa fill_config_form con los datos." + restriccionComun
    : isPaymentMode
    ? "CONTEXTO: Estás DENTRO del formulario de MÉTODOS DE PAGO. Solo creas métodos de pago aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para crear métodos de pago, dicta el método'. Extrae: nombre, descripcion. Usa fill_payment_form con los datos." + restriccionComun
    : isSucursalMode
    ? "CONTEXTO: Estás DENTRO del formulario de SUCURSALES. Solo creas o editas sucursales aquí. Si saludan o preguntan qué haces, responde: 'Estoy aquí para gestionar sucursales, dicta los datos'. Extrae: nombre, direccion, telefono, regla_clientes. Usa fill_sucursal_form con los datos." + restriccionComun
    : "";
  const instruccionFinal = instruccionProp || instruccionDefault;

  // Calcular posición fixed del popup al abrir (evita recorte por overflow:hidden del padre)
  useEffect(() => {
    if ((listening || status === "processing") && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        left: rect.left + rect.width / 2,
      });
    }
  }, [listening, status]);

  // Auto-reenviar texto pendiente cuando categoría esté lista
  useEffect(() => {
    if (isProductMode && categoriaId && pendingTextRef.current) {
      const text = pendingTextRef.current;
      pendingTextRef.current = null;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setStatus("processing");
        const payload = {
          text,
          accion,
          instruccion: instruccionFinal,
          categoriaId,
        };
        if (getFormContextRef.current) {
          payload.contexto = getFormContextRef.current();
        }
        wsRef.current.send(JSON.stringify(payload));

        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance("Procesando producto");
        utt.lang = "es-PE";
        window.speechSynthesis.speak(utt);
        toast.info("Procesando producto pendiente...");
      }
    }
  }, [categoriaId]);

  // ── WebSocket: conectar UNA vez, handlers usan refs ──
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws`);
      wsRef.current = ws;
    } catch {
      return;
    }

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      let messageText = event.data;
      try {
        const parsed = JSON.parse(messageText);
        if (parsed.action) {
          // Validar formulario ANTES de ejecutar click en botones de guardar
          let blocked = false;
          if (parsed.action === "click" && getFormContextRef.current) {
            const ctx = getFormContextRef.current();
            if (ctx) {
              const faltantes = ctx.camposFaltantes || [];
              const logoRequerido = ctx.tieneLogo !== undefined;
              const faltaLogo = logoRequerido && !ctx.tieneLogo;

              if (faltaLogo || faltantes.length > 0) {
                blocked = true;
                const problemas = [];
                if (faltaLogo) problemas.push("subir el logo de la empresa");
                if (faltantes.length > 0) problemas.push("completar: " + faltantes.join(", "));
                messageText = "No puedo guardar. Falta " + problemas.join(" y ");
              }
            }
          }

          if (!blocked) {
            // Dispatch fill events directly (works with or without VoiceAgentContext)
            if (parsed.action.startsWith("fill_") && parsed.data) {
              const eventName = `voice:${parsed.action.replace(/_/g, "-")}`;
              window.dispatchEvent(new CustomEvent(eventName, { detail: parsed.data }));
            } else {
              executeActionRef.current(parsed);
            }
            messageText = parsed.speak || parsed.message || "Listo";
            if (parsed.action === "click" && parsed.selector === "#btn-guardar-producto") {
              onProductoCreadoRef.current?.();
            }
          }
        } else if (parsed.message || parsed.speak) {
          messageText = parsed.message || parsed.speak;
        }
      } catch {
        // texto plano
      }

      if (
        messageText.includes("Producto creado") ||
        messageText.includes("creado exitosamente") ||
        messageText.includes("ha sido creado")
      ) {
        pendingTextRef.current = null; // Limpiar memoria
        onProductoCreadoRef.current?.();
      }

      // TTS — limpiar markdown, emojis y caracteres no hablables
      messageText = messageText
        .replace(/\*\*/g, "")       // negritas **texto**
        .replace(/\*/g, "")         // cursivas *texto* o viñetas
        .replace(/^#{1,6}\s+/gm, "") // encabezados # ## ###
        .replace(/^[-•]\s+/gm, "")  // listas con guion o bullet
        .replace(/`/g, "")          // backticks `código`
        .replace(/[\/,]/g, " ")     // slashes y comas
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2194}-\u{2199}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, "")  // emojis
        .replace(/[🔹🔸🔷🔶◆◇●○►▸▹▪▫★☆✓✔✗✘→←↑↓⬆⬇➡⬅📌📎💡⚡🎯🔑📋📝🛒🏪💰🧾📊📈]/gu, "")  // símbolos comunes
        .replace(/\s{2,}/g, " ")    // espacios múltiples
        .trim();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.lang = "es-PE";
      utterance.onstart = () => setStatus("speaking");
      utterance.onend = () => setStatus("idle");
      window.speechSynthesis.speak(utterance);
    };

    ws.onclose = () => { setConnected(false); setStatus("idle"); };
    ws.onerror = () => { setConnected(false); };

    return () => ws.close();
  }, []); // Conectar UNA sola vez

  // ── Iniciar grabación ──
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    // Crear reconocimiento NUEVO cada vez (sin closures viejos)
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "es-PE";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + " ";
        } else {
          interim += t;
        }
      }
      finalTranscriptRef.current = final.trim();
      fullTranscriptRef.current = (final + interim).trim();
      setTranscript(final + interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") {
        listeningRef.current = false;
        setListening(false);
        setStatus("idle");
      }
    };

    recognition.onend = () => {
      // Si sigue en modo escucha, reiniciar (modo continuo)
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          listeningRef.current = false;
          setListening(false);
          setStatus("idle");
        }
      }
    };

    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";
    fullTranscriptRef.current = "";
    setTranscript("");

    try {
      recognition.start();
      listeningRef.current = true;
      setListening(true);
      setStatus("listening");
    } catch {
      toast.error("Error al iniciar grabación");
    }
  };

  // ── Parar grabación y enviar ──
  const stopAndSend = () => {
    // Primero marcar que ya no escuchamos (evita restart en onend)
    listeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);

    // Esperar a que el reconocimiento finalice el último fragmento
    // (recognition.stop() es async - onresult final llega después)
    setTimeout(() => {
      const text = finalTranscriptRef.current.trim() || fullTranscriptRef.current.trim();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && text) {
        setStatus("processing");
        const payload = { text };
        if (accion) {
          payload.accion = accion;
          payload.instruccion = instruccionFinal;
        }
        if (categoriaId) payload.categoriaId = categoriaId;
        if (getFormContextRef.current) {
          payload.contexto = getFormContextRef.current();
        }
        wsRef.current.send(JSON.stringify(payload));
      } else {
        setStatus("idle");
        if (!text) toast.info("No se detectó audio");
      }

      setTranscript("");
      finalTranscriptRef.current = "";
      fullTranscriptRef.current = "";
    }, 500);
  };

  // ── Cancelar todo ──
  const cancelAll = () => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    setListening(false);
    setStatus("idle");
    setTranscript("");
    finalTranscriptRef.current = "";
    fullTranscriptRef.current = "";
  };

  // ── Handler del botón ──
  const handleClick = () => {
    if (status === "processing" || status === "speaking") {
      cancelAll();
      return;
    }
    if (listening) {
      stopAndSend();
    } else {
      startListening();
    }
  };

  // ── Cleanup al desmontar ──
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (wsRef.current) wsRef.current.close();
      window.speechSynthesis.cancel();
    };
  }, []);

  // ── Tamaños según prop size ──
  const btnSize = isLg ? "w-14 h-14" : "w-9 h-9";
  const iconSize = isLg ? "w-7 h-7" : "w-4 h-4";
  const pauseBarH = isLg ? "h-5" : "h-3.5";
  const pauseBarW = isLg ? "w-1.5" : "w-1";
  const dotSize = isLg ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
  const transcriptWidth = isLg ? "w-80" : "w-64";

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Botón circular */}
      <button
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" && listeningRef.current) { e.preventDefault(); stopAndSend(); } }}
        className={`relative ${btnSize} rounded-full flex items-center justify-center transition-all duration-300 ${
          listening
            ? "bg-red-500 shadow-lg shadow-red-500/40 hover:bg-red-600"
            : status === "processing"
            ? "bg-yellow-500 shadow-lg shadow-yellow-500/30 hover:bg-yellow-600 cursor-pointer"
            : status === "speaking"
            ? "bg-green-500 shadow-lg shadow-green-500/30 hover:bg-green-600 cursor-pointer"
            : isLg
            ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40 hover:from-blue-600 hover:to-blue-700 hover:scale-105"
            : "bg-white shadow-md hover:shadow-lg hover:scale-110"
        }`}
        title={
          listening ? "Pausar y enviar (Enter)"
          : status === "processing" ? "Cancelar"
          : status === "speaking" ? "Detener respuesta"
          : isProductMode ? "Dictar producto por voz"
          : isClientMode ? "Dictar datos del cliente"
          : isComboMode ? "Dictar combo por voz"
          : isCategoryMode ? "Dictar categoría por voz"
          : isConfigMode ? "Dictar configuración por voz"
          : isPaymentMode ? "Dictar método de pago por voz"
          : isSucursalMode ? "Dictar sucursal por voz"
          : "Asistente de voz IA"
        }
      >
        {/* Anillos de presencia en idle para size lg */}
        {isLg && status === "idle" && !listening && (
          <>
            <span className="absolute -inset-1 rounded-full border-2 border-blue-400/40 voice-ring-1"></span>
            <span className="absolute -inset-2.5 rounded-full border border-blue-300/25 voice-ring-2"></span>
            <span className="absolute -inset-4 rounded-full border border-blue-200/15 voice-ring-3"></span>
          </>
        )}
        {listening && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30"></span>
            <span className="absolute -inset-1 rounded-full border border-red-300 animate-pulse opacity-25"></span>
            <span className="absolute -inset-2.5 rounded-full border border-red-200 animate-pulse opacity-15" style={{animationDelay:'0.3s'}}></span>
          </>
        )}
        {status === "speaking" && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-25"></span>
            <span className="absolute -inset-1.5 rounded-full border border-green-300 animate-pulse opacity-20"></span>
          </>
        )}

        {listening ? (
          <div className="flex items-center gap-1">
            <span className={`${pauseBarW} ${pauseBarH} bg-white rounded-sm`}></span>
            <span className={`${pauseBarW} ${pauseBarH} bg-white rounded-sm`}></span>
          </div>
        ) : status === "processing" ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${iconSize} text-white animate-spin`}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`${iconSize} ${status === "idle" && !isLg ? "text-blue-600" : "text-white"}`}>
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}

        <span className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-white ${
          listening ? "bg-red-500 animate-pulse"
          : status === "processing" ? "bg-yellow-500 animate-pulse"
          : status === "speaking" ? "bg-green-500"
          : connected ? "bg-emerald-400"
          : "bg-gray-400"
        }`}></span>
      </button>

      {/* Transcript flotante — usa fixed para no cortarse con overflow:hidden del padre */}
      {(listening || status === "processing") && popupPos && (
        <div
          className={`${transcriptWidth} animate-fade-in`}
          style={{
            position: "fixed",
            top: popupPos.top,
            ...(isLg
              ? { left: popupPos.left, transform: "translateX(-50%)" }
              : { right: popupPos.right }),
            zIndex: 9999,
          }}
        >
          <div className="bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2.5 rounded-xl shadow-2xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              {listening ? (
                <>
                  <div className="flex items-end gap-[2px] h-3">
                    {[0, 0.1, 0.2, 0.1, 0].map((d, i) => (
                      <span key={i} className="voice-bar-sm" style={{animationDelay: `${d}s`}}></span>
                    ))}
                  </div>
                  <span className="text-[10px] text-red-400 font-medium uppercase tracking-wider">
                    {isProductMode ? "Dicta el producto" : isClientMode ? "Dicta datos del cliente" : isComboMode ? "Dicta el combo" : isCategoryMode ? "Dicta la categoría" : isConfigMode ? "Dicta la configuración" : isPaymentMode ? "Dicta el método de pago" : isSucursalMode ? "Dicta la sucursal" : "Escuchando..."}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-yellow-400 font-medium uppercase tracking-wider">
                    {isProductMode ? "Creando..." : isClientMode ? "Buscando cliente..." : isComboMode ? "Creando combo..." : isCategoryMode ? "Creando categoría..." : isConfigMode ? "Guardando..." : isPaymentMode ? "Creando método..." : isSucursalMode ? "Creando sucursal..." : "Procesando..."}
                  </span>
                </>
              )}
            </div>
            {transcript && (
              <p className="text-sm italic text-gray-200 leading-snug">"{transcript}"</p>
            )}
            {!transcript && listening && (
              <p className="text-xs text-gray-500">
                {isProductMode
                  ? "Ej: vestido rojo talla M, 50 soles"
                  : isClientMode
                  ? "Ej: DNI 12345678, teléfono 987654321"
                  : isComboMode
                  ? "Ej: combo fiesta, precio 200 soles"
                  : isCategoryMode
                  ? "Ej: categoría vestidos, ropa elegante"
                  : isConfigMode
                  ? "Ej: empresa Mi Tienda, RUC 12345678901"
                  : isPaymentMode
                  ? "Ej: método Yape, pago por app"
                  : isSucursalMode
                  ? "Ej: sucursal Centro, Av. Lima 123, tel 987654321"
                  : "Habla para dictar..."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Indicador de respuesta para size lg */}
      {isLg && status === "speaking" && !listening && popupPos && (
        <div
          className="animate-fade-in"
          style={{ position: "fixed", top: popupPos.top, left: popupPos.left, transform: "translateX(-50%)", zIndex: 9999 }}
        >
          <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-xl shadow-2xl border border-gray-700/50 whitespace-nowrap flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Respondiendo...</span>
          </div>
        </div>
      )}

      <style>{`
        .voice-bar-sm {
          width: 2px;
          background: #f87171;
          border-radius: 1px;
          animation: voice-wave-sm 0.6s ease-in-out infinite;
        }
        @keyframes voice-wave-sm {
          0%, 100% { height: 3px; }
          50% { height: 10px; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .voice-ring-1 {
          animation: voice-breathe 3s ease-in-out infinite;
        }
        .voice-ring-2 {
          animation: voice-breathe 3s ease-in-out infinite 0.6s;
        }
        .voice-ring-3 {
          animation: voice-breathe 3s ease-in-out infinite 1.2s;
        }
        @keyframes voice-breathe {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
