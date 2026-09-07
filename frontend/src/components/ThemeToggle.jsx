import { useEffect, useState } from 'react';
import { IconSun, IconMoon } from './Icons';
import { getInitialTheme, applyTheme } from '../theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
