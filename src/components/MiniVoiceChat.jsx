import React, { useEffect, useState, useRef } from "react";
import { useVoiceAgent } from "../context/VoiceAgentContext";
import { Mic, Send, MessageSquare, Volume2, StopCircle } from "lucide-react";
import { WS_BASE_URL } from "../config";

export default function MiniVoiceChat({ onOpenFullChat, onNavigate }) {
  const { executeAction } = useVoiceAgent();
  const [status, setStatus] = useState("Desconectado");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  // Obtener la mejor voz disponible
  const getBestVoice = () => {
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
  };

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
      let shouldCloseAndNavigate = false;

      try {
        const actionData = JSON.parse(messageText);
        if (actionData && actionData.action) {
          if (actionData.action === "navigate") {
            shouldCloseAndNavigate = true;
          }
          executeAction(actionData);
          speakText = actionData.speak || "Listo";
          messageText = actionData.speak || "Acción ejecutada";
        }
      } catch (e) {
        messageText = messageText.replace(/[\/,]/g, " ");
        speakText = messageText;
      }

      setLastMessage(messageText);

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speakText);
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = "es-PE";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        if (shouldCloseAndNavigate && onNavigate) {
          onNavigate();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    ws.onclose = () => setStatus("Desconectado");
    ws.onerror = () => setStatus("Error");

    return () => ws.close();
  }, [executeAction, onNavigate]);

  // Cargar voces
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {};
  }, []);

  // Speech-to-Text - Continuo hasta que el usuario pare
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "es-PE";
    recognition.interimResults = true; // Mostrar mientras habla
    recognition.continuous = true; // No parar automáticamente

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      finalTranscriptRef.current = final.trim();
      setCurrentTranscript(final + interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") {
        setListening(false);
      }
    };

    recognition.onend = () => {
      // Si todavía está en modo escucha, reiniciar
      if (listening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          setListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
  }, [listening]);

  // Iniciar grabación
  const startListening = () => {
    finalTranscriptRef.current = "";
    setCurrentTranscript("");
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch (e) {
    }
  };

  // Parar grabación y enviar
  const stopAndSend = () => {
    recognitionRef.current?.stop();
    setListening(false);

    const text = finalTranscriptRef.current.trim() || currentTranscript.trim();
    if (wsRef.current && text) {
      wsRef.current.send(JSON.stringify({ text }));
      setCurrentTranscript("");
      finalTranscriptRef.current = "";
    }
  };

  // Cancelar grabación sin enviar
  const cancelListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setCurrentTranscript("");
    finalTranscriptRef.current = "";
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="relative flex items-center">
      {/* Contenedor principal - más prominente */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-full px-4 py-2.5 shadow-xl border border-slate-600/50">

        {/* Indicador de estado */}
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            status === "Conectado" ? "bg-green-400 animate-pulse" :
            status === "Error" ? "bg-red-400" : "bg-amber-400"
          }`}
          title={status}
        />

        {/* MODO ESCUCHANDO */}
        {listening ? (
          <>
            {/* Animación de ondas de voz */}
            <div className="flex items-center gap-0.5 px-2">
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
              <div className="w-1 h-6 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '100ms'}} />
              <div className="w-1 h-5 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '200ms'}} />
              <div className="w-1 h-7 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}} />
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '400ms'}} />
            </div>

            {/* Botón Enviar (para y envía) */}
            <button
              onClick={stopAndSend}
              className="p-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/40 transition-all duration-200 hover:scale-105"
              title="Enviar comando"
            >
              <Send className="w-5 h-5 text-white" />
            </button>

            {/* Botón Cancelar */}
            <button
              onClick={cancelListening}
              className="p-2.5 rounded-full bg-slate-600 hover:bg-slate-500 transition-all"
              title="Cancelar"
            >
              <StopCircle className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          <>
            {/* Botón micrófono grande */}
            <button
              onClick={startListening}
              className="p-3.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/40 transition-all duration-200 hover:scale-105"
              title="Hablar"
            >
              <Mic className="w-6 h-6 text-white" />
            </button>

            {/* Botón detener voz - solo visible cuando habla */}
            {speaking && (
              <button
                onClick={stopSpeaking}
                className="p-2.5 rounded-full bg-orange-500 hover:bg-orange-600 transition-all shadow-md animate-pulse"
                title="Detener voz"
              >
                <Volume2 className="w-5 h-5 text-white" />
              </button>
            )}
          </>
        )}

        {/* Separador */}
        <div className="w-px h-7 bg-white/20" />

        {/* Botón abrir chat completo */}
        <button
          onClick={onOpenFullChat}
          className="p-2.5 rounded-full bg-slate-600 hover:bg-slate-500 transition-all"
          title="Abrir chat completo"
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Indicador flotante cuando habla la IA */}
      {speaking && !listening && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-slate-900/95 text-white text-sm px-5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-3 shadow-2xl border border-slate-700 z-50">
          <Volume2 className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="max-w-[300px] truncate font-medium">{lastMessage}</span>
        </div>
      )}

      {/* Indicador flotante cuando escucha - muestra lo que escucha */}
      {listening && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm px-5 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-50 min-w-[200px] max-w-[400px]">
          <div className="flex gap-1 flex-shrink-0">
            <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
            <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
            <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
          </div>
          <span className="font-medium truncate">
            {currentTranscript || "Escuchando..."}
          </span>
        </div>
      )}
    </div>
  );
}
