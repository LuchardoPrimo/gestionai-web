import { useMemo } from "react";
import { useData } from "../data/DataProvider.jsx";
import { extractGeneralNotepadMentions } from "../lib/notepad.js";

// Devuelve los párrafos del anotador general que mencionan `sedeId` (vía #tag).
export function useGeneralNotepadMentions(sedeId) {
  const { notepadHtml } = useData();
  return useMemo(() => {
    if (!sedeId) return [];
    const grouped = extractGeneralNotepadMentions(notepadHtml || "");
    return grouped[sedeId] || [];
  }, [sedeId, notepadHtml]);
}
