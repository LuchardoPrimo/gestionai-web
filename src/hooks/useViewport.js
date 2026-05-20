import { useState, useEffect } from "react";

// Devuelve true si la ventana mide menos que el breakpoint (default: 768 px).
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [breakpoint]);
  return isMobile;
}

// Visibilidad del anotador general — persiste en localStorage.
// Default: oculto en mobile, visible en desktop, salvo que el usuario haya elegido lo contrario.
export function useNotepadVisibility() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("guanaco.notepadVisible");
    if (saved !== null) return saved === "true";
    return window.innerWidth >= 768;
  });
  const update = (v) => {
    setVisible(v);
    try { window.localStorage.setItem("guanaco.notepadVisible", String(v)); } catch { /* ignore */ }
  };
  return [visible, update, isMobile];
}
