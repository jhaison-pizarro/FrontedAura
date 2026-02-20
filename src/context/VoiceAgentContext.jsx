import React, { createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getUsuario } from "../funciones/auth";

const VoiceAgentContext = createContext(null);

// Mapa de rutas y qué roles tienen acceso
const ROUTE_PERMISSIONS = {
  "/ventas": ["administrador", "vendedor"],
  "/reservas": ["administrador", "vendedor"],
  "/reserva-grupal": ["administrador", "vendedor"],
  "/productos": ["administrador", "gerente", "vendedor"],
  "/categorias": ["administrador", "gerente", "vendedor"],
  "/combos": ["administrador", "gerente"],
  "/usuarios": ["administrador", "gerente"],
  "/pagos": ["administrador", "gerente"],
  "/reportes": ["administrador", "gerente"],
  "/dashboards": ["administrador", "gerente"],
  "/configuracion": ["administrador"],
  "/caja/abrir": ["administrador", "vendedor"],
  "/caja/cerrar": ["administrador", "vendedor"],
  "/mi-perfil": ["administrador", "gerente", "vendedor"],
  "/principal": ["administrador", "gerente", "vendedor"],
};

// Nombres amigables de las rutas para el mensaje
const ROUTE_NAMES = {
  "/ventas": "Ventas",
  "/reservas": "Reservas",
  "/reserva-grupal": "Reserva Grupal",
  "/productos": "Productos",
  "/categorias": "Categorías",
  "/combos": "Combos",
  "/usuarios": "Usuarios",
  "/pagos": "Métodos de Pago",
  "/reportes": "Reportes",
  "/dashboards": "Dashboard",
  "/configuracion": "Configuración",
  "/caja/abrir": "Abrir Caja",
  "/caja/cerrar": "Cerrar Caja",
};

export function VoiceAgentProvider({ children }) {
  const navigate = useNavigate();

  // Verificar si el usuario tiene permiso para acceder a una ruta
  const tieneAcceso = useCallback((route) => {
    if (!route) return true;
    const usuario = getUsuario();
    if (!usuario) return false;
    const userRole = (usuario.perfil || "").toLowerCase();
    const rolesPermitidos = ROUTE_PERMISSIONS[route];
    // Si la ruta no está en el mapa, permitir acceso
    if (!rolesPermitidos) return true;
    return rolesPermitidos.includes(userRole);
  }, []);

  // Ejecutar acción de navegación
  const executeNavigate = useCallback((route, data) => {
    if (!route) return;

    if (!tieneAcceso(route)) {
      const nombreRuta = ROUTE_NAMES[route] || route;
      toast.error(`No tienes acceso al módulo "${nombreRuta}". Tu rol no tiene permisos para esa sección.`);
      return false;
    }

    navigate(route, { state: data });
    return true;
  }, [navigate, tieneAcceso]);

  // Ejecutar llenado de formulario
  const executeFillForm = useCallback((data) => {
    if (!data) return;

    // Esperar un momento para que la página cargue
    setTimeout(() => {
      Object.entries(data).forEach(([fieldName, value]) => {
        // Buscar por name, id, o data-field
        const selectors = [
          `[name="${fieldName}"]`,
          `#${fieldName}`,
          `[data-field="${fieldName}"]`,
          `input[placeholder*="${fieldName}" i]`,
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            // Simular evento de cambio para React
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            ).set;
            nativeInputValueSetter.call(element, value);

            const event = new Event("input", { bubbles: true });
            element.dispatchEvent(event);

            // También disparar change
            const changeEvent = new Event("change", { bubbles: true });
            element.dispatchEvent(changeEvent);
            break;
          }
        }
      });
    }, 500);
  }, []);

  // Abrir modal
  const executeOpenModal = useCallback((modalName) => {
    // Disparar evento custom que los componentes pueden escuchar
    window.dispatchEvent(new CustomEvent("voice-agent-modal", {
      detail: { action: "open", modal: modalName }
    }));
  }, []);

  // Cerrar modal
  const executeCloseModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent("voice-agent-modal", {
      detail: { action: "close" }
    }));

    // También intentar cerrar con ESC o click en overlay
    const closeButtons = document.querySelectorAll('[data-close-modal], .modal-close, [aria-label="Cerrar"]');
    closeButtons.forEach(btn => btn.click());
  }, []);

  // Ejecutar click
  const executeClick = useCallback((selector) => {
    if (!selector) return;

    const element = document.querySelector(selector);
    if (element) {
      element.click();
    }
  }, []);

  // Aplicar filtros
  const executeFilter = useCallback((data) => {
    window.dispatchEvent(new CustomEvent("voice-agent-filter", {
      detail: data
    }));
  }, []);

  // Resaltar elementos
  const executeHighlight = useCallback((selectors) => {
    if (!selectors || !selectors.length) return;

    // Remover highlights anteriores
    document.querySelectorAll(".voice-highlight").forEach(el => {
      el.classList.remove("voice-highlight");
    });

    // Agregar nuevos highlights
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add("voice-highlight");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // Remover highlights después de 3 segundos
    setTimeout(() => {
      document.querySelectorAll(".voice-highlight").forEach(el => {
        el.classList.remove("voice-highlight");
      });
    }, 3000);
  }, []);

  // Ejecutar acción completa del MCP
  const executeAction = useCallback((actionData) => {
    if (!actionData || !actionData.action) return null;

    const { action, route, data, selector, modal, highlight } = actionData;
    const msgSinAcceso = "No tienes acceso a ese módulo con tu rol actual.";

    switch (action) {
      case "navigate":
        if (executeNavigate(route, data) === false) return msgSinAcceso;
        if (data) {
          executeFillForm(data);
        }
        break;

      case "fill_form":
        if (route) {
          if (executeNavigate(route) === false) return msgSinAcceso;
        }
        executeFillForm(data);
        break;

      case "open_modal":
        if (route) {
          if (executeNavigate(route) === false) return msgSinAcceso;
        }
        setTimeout(() => executeOpenModal(modal), 300);
        break;

      case "close_modal":
        executeCloseModal();
        break;

      case "click":
        executeClick(selector);
        break;

      case "filter":
        if (route) {
          if (executeNavigate(route) === false) return msgSinAcceso;
        }
        setTimeout(() => executeFilter(data), 300);
        break;

      // fill_* actions are handled directly by VoiceMicButton via CustomEvents

      case "read_data":
        if (route) {
          if (executeNavigate(route) === false) return msgSinAcceso;
        }
        break;

      default:
    }

    // Resaltar elementos si se especifica
    if (highlight && highlight.length) {
      setTimeout(() => executeHighlight(highlight), 500);
    }

    return actionData.speak || null;
  }, [executeNavigate, executeFillForm, executeOpenModal, executeCloseModal, executeClick, executeFilter, executeHighlight]);

  const value = {
    executeAction,
    executeNavigate,
    executeFillForm,
    executeOpenModal,
    executeCloseModal,
    executeClick,
    executeFilter,
    executeHighlight,
  };

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useVoiceAgent() {
  const context = useContext(VoiceAgentContext);
  if (!context) {
    // Retornar funciones vacías en lugar de crashear
    return {
      executeAction: () => null,
      executeNavigate: () => {},
      executeFillForm: () => {},
      executeOpenModal: () => {},
      executeCloseModal: () => {},
      executeClick: () => {},
      executeFilter: () => {},
      executeHighlight: () => {},
    };
  }
  return context;
}

export default VoiceAgentContext;
