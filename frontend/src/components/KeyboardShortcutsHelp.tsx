import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'J', description: 'Next article' },
    { key: 'K', description: 'Previous article' },
    { key: 'O or Enter', description: 'Open selected article' },
    { key: 'M', description: 'Toggle read/unread' },
    { key: '/', description: 'Focus search' },
    { key: 'G H', description: 'Go to Home' },
    { key: '?', description: 'Show this help' },
    { key: 'Esc', description: 'Close modals' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-border rounded transition-colors"
            aria-label="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-border rounded text-sm font-mono font-semibold">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border text-sm text-muted">
          <p>Press <kbd className="px-1.5 py-0.5 bg-border rounded text-xs">?</kbd> to show/hide this help.</p>
        </div>
      </div>
    </div>
  );
}




