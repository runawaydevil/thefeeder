# Design Document

## Overview

Este documento descreve o design técnico para implementar um sistema de troca de temas no TheFeeder, permitindo aos usuários alternar entre o tema vaporwave atual e um novo tema clean minimalista. A solução usa CSS variables, localStorage para persistência, e React hooks para gerenciamento de estado.

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Current Theme System                                     │
│                                                          │
│  - Single vaporwave theme hardcoded                     │
│  - Styles in globals.css and Tailwind                   │
│  - No theme switching capability                        │
│  - No user preference storage                           │
└─────────────────────────────────────────────────────────┘
```

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│ New Theme System                                         │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ ThemeProvider (React Context)                  │    │
│  │  - Manages theme state                          │    │
│  │  - Loads from localStorage                      │    │
│  │  - Provides theme toggle function               │    │
│  └────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────┐    │
│  │ CSS Variables (themes.css)                     │    │
│  │  - [data-theme="vaporwave"] { ... }            │    │
│  │  - [data-theme="clean"] { ... }                │    │
│  └────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────┐    │
│  │ ThemeToggle Component                          │    │
│  │  - Button in footer                             │    │
│  │  - Shows current theme                          │    │
│  │  - Triggers theme change                        │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Theme Context (`ThemeContext`)

**Responsabilidade**: Gerenciar estado global do tema

```typescript
type Theme = "vaporwave" | "clean";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
```

### 2. Theme Provider (`ThemeProvider`)

**Responsabilidade**: Fornecer contexto de tema para toda a aplicação

```typescript
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("vaporwave");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && (savedTheme === "vaporwave" || savedTheme === "clean")) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    
    // Broadcast to other tabs
    window.dispatchEvent(new StorageEvent("storage", {
      key: "theme",
      newValue: newTheme,
    }));
  };

  const toggleTheme = () => {
    setTheme(theme === "vaporwave" ? "clean" : "vaporwave");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {mounted ? children : null}
    </ThemeContext.Provider>
  );
}
```

### 3. Theme Hook (`useTheme`)

**Responsabilidade**: Hook para acessar contexto de tema

```typescript
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
```

### 4. Theme Toggle Component (`ThemeToggle`)

**Responsabilidade**: Botão para alternar temas

```typescript
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "vaporwave" ? "clean" : "vaporwave"} theme`}
      title={`Current: ${theme}`}
    >
      <span className="theme-icon">
        {theme === "vaporwave" ? "🎨" : "📄"}
      </span>
      <span className="theme-label">THEME</span>
    </button>
  );
}
```

### 5. CSS Variables System (`themes.css`)

**Responsabilidade**: Definir cores e estilos para cada tema

```css
:root {
  /* Transition for smooth theme changes */
  --theme-transition: color 0.3s ease-in-out, 
                      background-color 0.3s ease-in-out,
                      border-color 0.3s ease-in-out;
}

/* Vaporwave Theme (Default) */
[data-theme="vaporwave"] {
  --color-bg-primary: hsl(280, 60%, 8%);
  --color-bg-secondary: hsl(260, 50%, 5%);
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.9);
  --color-accent-primary: hsl(320, 100%, 65%); /* Pink */
  --color-accent-secondary: hsl(180, 100%, 60%); /* Cyan */
  --color-border: rgba(0, 217, 255, 0.2);
  
  --font-heading: 'Orbitron', 'Arial Black', sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  --shadow-glow: 0 0 10px currentColor;
  --shadow-card: 0 0 20px hsla(180, 100%, 60%, 0.5);
  
  --effect-scanlines: block;
  --effect-grid: block;
  --effect-stars: block;
}

/* Clean Theme */
[data-theme="clean"] {
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #FAFAFA;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #4A4A4A;
  --color-accent-primary: #0066CC; /* Blue */
  --color-accent-secondary: #000000; /* Black */
  --color-border: #E0E0E0;
  
  --font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  --shadow-glow: none;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  --effect-scanlines: none;
  --effect-grid: none;
  --effect-stars: none;
}

/* Apply transitions to elements */
body,
.header,
.feed-item,
.subscribe-form,
.footer {
  transition: var(--theme-transition);
}
```

## Data Models

Não há mudanças nos modelos de dados do Prisma. A preferência de tema é armazenada apenas no localStorage do navegador.

## Component Updates

### 1. Root Layout (`app/layout.tsx`)

```typescript
import { ThemeProvider } from "@/src/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 2. Home Page (`app/page.tsx`)

```typescript
import { ThemeToggle } from "@/src/components/ThemeToggle";

// Replace "READY" button with ThemeToggle
<div className="footer-status">
  <ThemeToggle />
</div>
```

### 3. Global Styles (`app/globals.css`)

```css
/* Update to use CSS variables */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-body);
}

h1, h2, h3 {
  font-family: var(--font-heading);
  color: var(--color-accent-primary);
  text-shadow: var(--shadow-glow);
}

.feed-item {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.scanlines {
  display: var(--effect-scanlines);
}

.vaporwave-grid {
  display: var(--effect-grid);
}
```

## Error Handling

### localStorage Not Available

```typescript
function getStoredTheme(): Theme | null {
  try {
    return localStorage.getItem("theme") as Theme;
  } catch (error) {
    console.warn("localStorage not available:", error);
    return null;
  }
}

function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    console.warn("Failed to save theme:", error);
  }
}
```

### Invalid Theme Value

```typescript
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "vaporwave" || savedTheme === "clean") {
  setThemeState(savedTheme);
} else {
  // Invalid value, use default
  setThemeState("vaporwave");
  localStorage.setItem("theme", "vaporwave");
}
```

## Testing Strategy

### Unit Tests

1. **ThemeProvider**
   - Test initial theme load from localStorage
   - Test theme toggle
   - Test theme persistence
   - Test invalid theme handling

2. **ThemeToggle Component**
   - Test button renders correctly
   - Test click toggles theme
   - Test aria-label updates
   - Test icon changes

3. **CSS Variables**
   - Test variables are defined for both themes
   - Test transitions are applied
   - Test fallback values

### Integration Tests

1. **Theme Switching**
   - Test theme changes immediately
   - Test localStorage is updated
   - Test data-theme attribute changes
   - Test CSS variables are applied

2. **Cross-Tab Sync**
   - Open multiple tabs
   - Change theme in one tab
   - Verify other tabs update

### Manual Testing

1. **Visual Testing**
   - Test all pages in vaporwave theme
   - Test all pages in clean theme
   - Test transitions are smooth
   - Test no flash of wrong theme

2. **Accessibility Testing**
   - Test keyboard navigation
   - Test screen reader announcements
   - Test contrast ratios
   - Test reduced motion preference

## Performance Considerations

### Initial Load

- Apply theme before React hydration to prevent flash
- Use inline script in HTML head
- Minimize CSS variable count

```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 'vaporwave';
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

### Transition Performance

- Only transition color properties
- Avoid transitioning layout properties
- Use `will-change` sparingly
- Disable transitions on initial load

### Memory Management

- Clean up event listeners
- Use single storage event listener
- Avoid unnecessary re-renders

## Security Considerations

### XSS Prevention

- Validate theme value from localStorage
- Only allow "vaporwave" or "clean"
- Sanitize any user input

### localStorage Limits

- Theme preference is small (~10 bytes)
- No risk of quota exceeded
- Handle gracefully if unavailable

## Accessibility

### Keyboard Navigation

```typescript
<button
  onClick={toggleTheme}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTheme();
    }
  }}
>
```

### Screen Reader Support

```typescript
<button
  aria-label={`Switch to ${theme === "vaporwave" ? "clean" : "vaporwave"} theme`}
  aria-live="polite"
>
  <span aria-hidden="true">🎨</span>
  <span>THEME</span>
</button>
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

### Color Contrast

- Vaporwave: Pink (#ff006e) on dark background (contrast > 7:1)
- Clean: Black (#1A1A1A) on white background (contrast > 15:1)
- Links: Blue (#0066CC) on white (contrast > 4.5:1)

## Documentation Requirements

### User Documentation

- Add section in README about theme switching
- Document keyboard shortcuts
- Explain theme persistence

### Developer Documentation

- Document CSS variable naming convention
- Provide guide for adding new themes
- Document theme testing checklist

## Migration Strategy

### Phase 1: Setup Infrastructure
1. Create ThemeProvider and context
2. Add CSS variables for vaporwave theme
3. Test with existing styles

### Phase 2: Implement Clean Theme
1. Define CSS variables for clean theme
2. Update components to use variables
3. Test visual consistency

### Phase 3: Add Theme Toggle
1. Create ThemeToggle component
2. Replace "READY" button in footer
3. Test theme switching

### Phase 4: Polish and Optimize
1. Add transitions
2. Optimize performance
3. Test accessibility
4. Add documentation

## Design Rationale

### Why CSS Variables?

- Easy to maintain and extend
- No JavaScript required for styling
- Smooth transitions
- Better performance than class swapping

### Why localStorage?

- Persists across sessions
- No server-side storage needed
- Fast access
- Widely supported

### Why React Context?

- Global state management
- Avoids prop drilling
- Easy to consume with hooks
- Type-safe with TypeScript

### Why Two Themes Initially?

- Simpler to implement and test
- Covers main use cases (vibrant vs minimal)
- Easy to extend later
- Reduces decision fatigue
