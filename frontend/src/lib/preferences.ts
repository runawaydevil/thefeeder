export interface Preferences {
  layout: 'cards' | 'list' | 'compact';
  density: 'comfortable' | 'normal' | 'dense';
  defaultSort: string;
  pinnedFeeds: number[];
  mutedKeywords: string[];
  blockedDomains: string[];
  theme: 'light' | 'dark' | 'sepia' | 'solarized';
  fontSize: 'small' | 'medium' | 'large';
  readItems: number[];
}

const STORAGE_KEY = 'pablo-feeds-preferences';

const DEFAULT_PREFERENCES: Preferences = {
  layout: 'cards',
  density: 'normal',
  defaultSort: 'recent',
  pinnedFeeds: [],
  mutedKeywords: [],
  blockedDomains: [],
  theme: 'light',
  fontSize: 'medium',
  readItems: [],
};

export function getPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

export function updatePreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
): Preferences {
  const current = getPreferences();
  const updated = { ...current, [key]: value };
  savePreferences(updated);
  return updated;
}

export function addReadItem(itemId: number): void {
  const prefs = getPreferences();
  if (!prefs.readItems.includes(itemId)) {
    prefs.readItems.push(itemId);
    savePreferences(prefs);
  }
}

export function removeReadItem(itemId: number): void {
  const prefs = getPreferences();
  prefs.readItems = prefs.readItems.filter(id => id !== itemId);
  savePreferences(prefs);
}

export function isRead(itemId: number): boolean {
  const prefs = getPreferences();
  return prefs.readItems.includes(itemId);
}

export function toggleRead(itemId: number): boolean {
  const isAlreadyRead = isRead(itemId);
  if (isAlreadyRead) {
    removeReadItem(itemId);
  } else {
    addReadItem(itemId);
  }
  return !isAlreadyRead;
}




