import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook que funciona como useState pero persiste el valor en sessionStorage.
 * Cuando el componente se desmonta (al navegar a otro módulo) y se vuelve
 * a montar, el estado se restaura automáticamente.
 *
 * @param {string} key   - Clave única para sessionStorage (ej: "ventas_form")
 * @param {*} defaultVal - Valor por defecto si no hay nada guardado
 * @returns {[value, setValue, clearValue]}
 */
export function useSessionState(key, defaultVal) {
  const prefixedKey = `aura_form_${key}`;

  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(prefixedKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return typeof defaultVal === "function" ? defaultVal() : defaultVal;
  });

  // Guardar en sessionStorage cada vez que cambie el valor
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    try {
      sessionStorage.setItem(prefixedKey, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  }, [value, prefixedKey]);

  // Función para limpiar (ej: después de guardar exitosamente)
  const clear = useCallback(() => {
    sessionStorage.removeItem(prefixedKey);
    setValue(typeof defaultVal === "function" ? defaultVal() : defaultVal);
  }, [prefixedKey, defaultVal]);

  return [value, setValue, clear];
}

/**
 * Hook para persistir valores de react-hook-form en sessionStorage.
 * Restaura los valores al montar y guarda los cambios automáticamente.
 *
 * @param {string} key   - Clave única (ej: "ventas_rhf")
 * @param {object} opts  - { watch, setValue } del useForm de react-hook-form
 * @returns {{ clearFormPersist: () => void }}
 */
export function useFormPersist(key, { watch, setValue }) {
  const prefixedKey = `aura_form_${key}`;

  // Restaurar valores al montar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(prefixedKey);
      if (saved) {
        const values = JSON.parse(saved);
        Object.entries(values).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            setValue(k, v);
          }
        });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar en cada cambio
  useEffect(() => {
    const subscription = watch((values) => {
      try {
        sessionStorage.setItem(prefixedKey, JSON.stringify(values));
      } catch {
        // ignore
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, prefixedKey]);

  const clearFormPersist = useCallback(() => {
    sessionStorage.removeItem(prefixedKey);
  }, [prefixedKey]);

  return { clearFormPersist };
}

/**
 * Limpia todos los datos de formulario guardados en sessionStorage.
 * Útil al cerrar sesión.
 */
export function limpiarFormulariosGuardados() {
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith("aura_form_")) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k));
}
