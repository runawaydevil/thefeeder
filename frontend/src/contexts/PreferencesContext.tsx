import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  getPreferences,
  savePreferences,
  updatePreference,
  type Preferences
} from '../lib/preferences';

interface PreferencesContextType extends Preferences {
  updatePreferences: (updates: Partial<Preferences>) => void;
  setLayout: (layout: Preferences['layout']) => void;
  setDensity: (density: Preferences['density']) => void;
  setDefaultSort: (sort: string) => void;
  setTheme: (theme: Preferences['theme']) => void;
  setFontSize: (fontSize: Preferences['fontSize']) => void;
  addPinnedFeed: (feedId: number) => void;
  removePinnedFeed: (feedId: number) => void;
  addMutedKeyword: (keyword: string) => void;
  removeMutedKeyword: (keyword: string) => void;
  addBlockedDomain: (domain: string) => void;
  removeBlockedDomain: (domain: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(getPreferences);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', prefs.theme);
    document.documentElement.setAttribute('data-font-size', prefs.fontSize);
  }, [prefs.theme, prefs.fontSize]);

  const updatePreferences = (updates: Partial<Preferences>) => {
    const updated = { ...prefs, ...updates };
    setPrefs(updated);
    savePreferences(updated);
  };

  const setLayout = (layout: Preferences['layout']) => {
    updatePreference('layout', layout);
    setPrefs(current => ({ ...current, layout }));
  };

  const setDensity = (density: Preferences['density']) => {
    updatePreference('density', density);
    setPrefs(current => ({ ...current, density }));
  };

  const setDefaultSort = (sort: string) => {
    updatePreference('defaultSort', sort);
    setPrefs(current => ({ ...current, defaultSort: sort }));
  };

  const setTheme = (theme: Preferences['theme']) => {
    updatePreference('theme', theme);
    setPrefs(current => ({ ...current, theme }));
  };

  const setFontSize = (fontSize: Preferences['fontSize']) => {
    updatePreference('fontSize', fontSize);
    setPrefs(current => ({ ...current, fontSize }));
  };

  const addPinnedFeed = (feedId: number) => {
    if (!prefs.pinnedFeeds.includes(feedId)) {
      const updated = [...prefs.pinnedFeeds, feedId];
      updatePreferences({ pinnedFeeds: updated });
    }
  };

  const removePinnedFeed = (feedId: number) => {
    const updated = prefs.pinnedFeeds.filter(id => id !== feedId);
    updatePreferences({ pinnedFeeds: updated });
  };

  const addMutedKeyword = (keyword: string) => {
    if (!prefs.mutedKeywords.includes(keyword)) {
      const updated = [...prefs.mutedKeywords, keyword];
      updatePreferences({ mutedKeywords: updated });
    }
  };

  const removeMutedKeyword = (keyword: string) => {
    const updated = prefs.mutedKeywords.filter(k => k !== keyword);
    updatePreferences({ mutedKeywords: updated });
  };

  const addBlockedDomain = (domain: string) => {
    if (!prefs.blockedDomains.includes(domain)) {
      const updated = [...prefs.blockedDomains, domain];
      updatePreferences({ blockedDomains: updated });
    }
  };

  const removeBlockedDomain = (domain: string) => {
    const updated = prefs.blockedDomains.filter(d => d !== domain);
    updatePreferences({ blockedDomains: updated });
  };

  const value: PreferencesContextType = {
    ...prefs,
    updatePreferences,
    setLayout,
    setDensity,
    setDefaultSort,
    setTheme,
    setFontSize,
    addPinnedFeed,
    removePinnedFeed,
    addMutedKeyword,
    removeMutedKeyword,
    addBlockedDomain,
    removeBlockedDomain,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}




