import React, { useEffect, useState, useRef, useCallback } from "react";
import { useVoiceAgent } from "../context/VoiceAgentContext";
import { WS_BASE_URL } from "../config";

export default function ChatMCP({ categoriaId, onClose }) {
  const { executeAction } = useVoiceAgent();

  // Obtener la mejor voz disponible
  const getBestVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
      "Microsoft Sabina",
      "Paulina",
      "Monica",
      "Google español",
      "Lucia",
      "es-PE",
      "es-ES",
      "es-MX",
    ];
    for (const preferred of preferredVoices) {
      const found = voices.find(v =>
        v.name.includes(preferred) || v.lang.includes(preferred)
      );
      if (found) return found;
    }
    return voices.find(v => v.lang.startsWith("es")) || voices[0];
  }, []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Desconectado");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [foto, setFoto] = useState(null); // 👈 foto seleccionada

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const messagesEndRef = useRef(null);

  // Scroll automático hacia abajo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Conexión WebSocket
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(`${WS_BASE_URL}/ws`);
      wsRef.current = ws;
    } catch (error) {
      setStatus("Error");
      return;
    }

    ws.onopen = () => setStatus("Conectado");
    ws.onmessage = (event) => {
      let messageText = event.data;
      let speakText = messageText;
      let shouldCloseModal = false;

      // Intentar parsear como JSON (acción del Voice Agent)
      try {
        const actionData = JSON.parse(messageText);

        // Si es una acción válida del Voice Agent
        if (actionData && actionData.action) {
          // Si es navegación, cerrar el modal después de hablar
          if (actionData.action === "navigate") {
            shouldCloseModal = true;
          }

          // Ejecutar la acción (navegar, llenar formulario, etc.)
          executeAction(actionData);
          speakText = actionData.speak || "Listo";
          messageText = actionData.speak || "Acción ejecutada";
        }
      } catch (e) {
        // No es JSON, es texto normal
        messageText = messageText.replace(/[\/,]/g, " ");
        speakText = messageText;
      }

      setMessages((prev) => [
        ...prev,
        { type: "bot", text: messageText, timestamp: Date.now() },
      ]);

      // Cancelar voz en curso
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(speakText);

      // Usar voz más natural
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = "es-PE";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        // Cerrar modal después de hablar si fue navegación
        if (shouldCloseModal && onClose) {
          onClose();
        }
      };

      window.speechSynthesis.speak(utterance);
    };
    ws.onclose = () => setStatus("Desconectado");
    ws.onerror = () => setStatus("Error");

    return () => ws.close();
  }, [executeAction, getBestVoice, onClose]);

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
      // 👇 agregamos foto + categoría ID
      const payload = {
        text: input,
        foto: foto ? foto : null,
        categoriaId: categoriaId || null,
      };

      wsRef.current.send(JSON.stringify(payload));

      setMessages((prev) => [
        ...prev,
        { type: "user", text: input, timestamp: Date.now() },
      ]);
      finalTranscriptRef.current = "";
      setInput("");
      setFoto(null); // reseteamos la foto después de enviar
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Manejo de subir foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoto(reader.result); // guardamos base64
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col lg:flex-row overflow-hidden max-h-[470px]">
      {/* Panel Izquierdo - Control de Voz */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-6 relative flex-1">
        {/* Estado de conexión */}
        <div className="mb-6 text-center z-10">
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

        {/* Botón micrófono */}
        <div className="relative z-10 mb-6">
          <button
            onClick={listening ? stopListening : startListening}
            className={`relative w-28 h-28 lg:w-32 lg:h-32 rounded-full backdrop-blur-sm border-2 transition-all duration-300 group ${
              listening
                ? "bg-red-500/30 border-red-400/70 shadow-lg shadow-red-500/50 hover:bg-red-500/40"
                : "bg-blue-500/30 border-blue-400/70 shadow-lg shadow-blue-500/50 hover:bg-blue-500/40 hover:scale-105"
            }`}
          >
            <div className="text-4xl lg:text-5xl">
              {listening ? "🔴" : "🎙️"}
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {listening ? "DETENER" : "HABLAR"}
            </div>
          </button>
        </div>

        {/* Input de texto + botón de foto + enviar */}
        <div className="w-full max-w-sm z-10">
          <div className="flex gap-2 items-center">
            {/* Input de texto */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 text-sm"
              placeholder="Escribe..."
            />

            {/* Botón de subir foto */}
            <label className="cursor-pointer px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm">
              📷
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </label>

            {/* Botón enviar */}
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg text-sm"
            >
              ➤
            </button>
          </div>

          {/* Preview de la foto seleccionada */}
          {foto && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={foto}
                alt="preview"
                className="w-12 h-12 object-cover rounded-lg border border-gray-700"
              />
              <span className="text-xs text-gray-300">📸 Foto lista</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho - Chat */}
      <div className="w-full lg:w-1/2 bg-black/40 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col relative flex-1">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            Chat con mi Asistente
          </h2>
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

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-sm">Asistente listo</p>
              <p className="text-xs text-gray-600">
                Habla o escribe para comenzar
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
                <div
                  className={`max-w-[80%] lg:max-w-xs px-3 py-2 rounded-2xl text-xs lg:text-sm ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      : "bg-gradient-to-r from-gray-800 to-gray-900 text-gray-200 border border-gray-700"
                  } shadow-lg`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))
          )}
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
      <style>{`
        .voice-highlight {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px;
          animation: voice-pulse 1s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        @keyframes voice-pulse {
          0%, 100% { outline-color: #3b82f6; }
          50% { outline-color: #60a5fa; }
        }
      `}</style>
    </div>
  );
}
