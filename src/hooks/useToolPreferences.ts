import { useCallback, useEffect, useState } from 'react';
import type { ToolId } from '../types/pdf';

const FAVORITES_STORAGE_KEY = 'vellum_favorite_tools_v1';
const RECENT_STORAGE_KEY = 'vellum_recent_tools_v1';

function readStoredList(key: string): ToolId[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredList(key: string, items: ToolId[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota or private-mode restrictions gracefully
  }
}

export function useToolPreferences() {
  const [favoriteIds, setFavoriteIds] = useState<ToolId[]>(() =>
    readStoredList(FAVORITES_STORAGE_KEY)
  );
  const [recentIds, setRecentIds] = useState<ToolId[]>(() =>
    readStoredList(RECENT_STORAGE_KEY)
  );

  useEffect(() => {
    writeStoredList(FAVORITES_STORAGE_KEY, favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    writeStoredList(RECENT_STORAGE_KEY, recentIds);
  }, [recentIds]);

  const toggleFavorite = useCallback((id: ToolId) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  }, []);

  const recordRecent = useCallback((id: ToolId) => {
    setRecentIds((prev) => [id, ...prev.filter((item) => item !== id)].slice(0, 4));
  }, []);

  const clearRecent = useCallback(() => {
    setRecentIds([]);
  }, []);

  return {
    favoriteIds,
    recentIds,
    toggleFavorite,
    recordRecent,
    clearRecent,
  };
}
