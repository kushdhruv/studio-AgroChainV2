export type Theme = 'light' | 'dark';

export function getTheme(theme: Theme) {
  return {
    light: {
      primary: '#0070f3',
      secondary: '#f5f5f5',
      accent: '#7928ca',
      background: '#ffffff',
      text: '#000000',
      error: '#ff0000',
      success: '#00ff00',
      warning: '#ffff00',
    },
    dark: {
      primary: '#0070f3',
      secondary: '#1a1a1a',
      accent: '#7928ca',
      background: '#000000',
      text: '#ffffff',
      error: '#ff0000',
      success: '#00ff00',
      warning: '#ffff00',
    }
  }[theme]
}