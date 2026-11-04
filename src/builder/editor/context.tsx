"use client";

import { createContext, useContext } from "react";
import { EMPTY_SETTINGS, type GlobalSettings } from "@/lib/model/settings";
import type { SavedBlockDoc } from "@/lib/model/types";

export type EditorContextValue = {
  pageId: string | null;
  /** Ajustes globales en borrador (lo que verá la página al publicarlos). */
  settings: GlobalSettings;
  savedBlocks: SavedBlockDoc[];
  readOnly: boolean;
};

export const EditorContext = createContext<EditorContextValue>({
  pageId: null,
  settings: EMPTY_SETTINGS,
  savedBlocks: [],
  readOnly: false,
});

export function useEditorContext() {
  return useContext(EditorContext);
}
