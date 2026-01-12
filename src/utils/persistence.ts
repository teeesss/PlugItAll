const STORAGE_KEY = 'unsub_static_ignored_items';

export const getIgnoredItems = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load ignored items', e);
    return [];
  }
};

export const ignoreItem = (name: string): void => {
  const current = getIgnoredItems();
  if (!current.includes(name)) {
    const updated = [...current, name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};

export const restoreItem = (name: string): void => {
  const current = getIgnoredItems();
  const updated = current.filter((item) => item !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearCache = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
