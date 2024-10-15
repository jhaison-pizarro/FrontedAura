import React, { useState, useEffect } from "react";
import { CiMicrophoneOn } from "react-icons/ci";

export function Compras() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [data, setData] = useState({}); // Para almacenar los datos organizados
  let recognition;

  useEffect(() => {
    if (isListening) {
      recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();

      recognition.interimResults = false; // No queremos resultados intermedios
      recognition.lang = "es-ES";

      recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const currentTranscript = event.results[lastResultIndex][0].transcript;

        // Solo guarda el resultado final
        setTranscript(currentTranscript);
        organizeData(currentTranscript); // Organiza los datos
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }

    // Cleanup function to stop recognition when unmounted
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isListening]);

  const handleStartListening = () => {
    setIsListening(true);
  };

  const handleStopListening = () => {
    if (recognition) {
      setIsListening(false);
      recognition.stop(); // Asegúrate de detener el reconocimiento
    }
  };

  const organizeData = (text) => {
    const newData = {};

    // Separar cada línea de texto en una lista
    const lines = text.split("\n");
    lines.forEach((line) => {
      const parts = line.split(":");
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase(); // Convierte a minúsculas para uniformidad
        const value = parts[1].trim();
        newData[key] = value; // Almacena en el objeto
      }
    });

    // Combinar los nuevos datos con los anteriores
    setData((prevData) => ({ ...prevData, ...newData }));
  };

  return (
    <div>
      <h1>Speech to Text</h1>
      <p>
        Instrucciones: Por favor, usa el formato "Campo: Valor" (ej. "Nombre:
        Juan Pérez")
      </p>
      <button
        className="bg-slate-200 rounded-lg pr-2 pl-2 hover:bg-green-200"
        onClick={isListening ? handleStopListening : handleStartListening}
      >
        {isListening ? "Detener" : <CiMicrophoneOn />}
      </button>
      <p className="text-amber-700">TEXTO TRANSCRITO: {transcript}</p>
      <h2>Datos organizados:</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
