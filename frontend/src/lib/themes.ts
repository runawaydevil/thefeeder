export type Theme = 'light' | 'dark' | 'sepia' | 'solarized' | 'high-contrast';
export type FontSize = 'small' | 'medium' | 'large';

export const themeConfig = {
  light: {
    name: 'Light',
    bg: 'white',
    fg: '#1a1a1a',
  },
  dark: {
    name: 'Dark',
    bg: '#0f0f0f',
    fg: '#e0e0e0',
  },
  sepia: {
    name: 'Sepia',
    bg: '#f4ecd8',
    fg: '#704214',
  },
  solarized: {
    name: 'Solarized',
    bg: '#fdf6e3',
    fg: '#657b83',
  },
  'high-contrast': {
    name: 'High Contrast',
    bg: '#ffffff',
    fg: '#000000',
  },
};

export function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // 200 WPM (Words Per Minute)
  return `${minutes} min`;
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyFontSize(fontSize: FontSize) {
  document.documentElement.setAttribute('data-font-size', fontSize);
}

export const fontSizeMap = {
  small: '0.875rem',
  medium: '1rem',
  large: '1.25rem',
};



