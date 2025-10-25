import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcuts {
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  onOpen?: () => void;
  onToggleRead?: () => void;
  onFocusSearch?: () => void;
  onGoHome?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  const keysPressed = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if typing in input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const key = event.key.toLowerCase();

    // Track keys for sequences (e.g., 'g h')
    keysPressed.current.add(key);

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to clear sequence
    timeoutRef.current = setTimeout(() => {
      keysPressed.current.clear();
      timeoutRef.current = undefined;
    }, 1000);

    // Single key shortcuts
    switch (key) {
      case 'j':
        shortcuts.onNavigateNext?.();
        break;
      case 'k':
        shortcuts.onNavigatePrev?.();
        break;
      case 'o':
      case 'enter':
        shortcuts.onOpen?.();
        break;
      case 'm':
        shortcuts.onToggleRead?.();
        break;
      case '/':
        event.preventDefault();
        shortcuts.onFocusSearch?.();
        break;
      case '?':
        shortcuts.onShowHelp?.();
        break;
      case 'escape':
        shortcuts.onEscape?.();
        break;
    }

    // Sequence shortcuts (e.g., 'g h')
    if (keysPressed.current.has('g')) {
      switch (key) {
        case 'h':
          shortcuts.onGoHome?.();
          keysPressed.current.clear();
          break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);
}




