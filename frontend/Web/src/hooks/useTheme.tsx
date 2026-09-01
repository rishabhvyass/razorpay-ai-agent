import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { duration } from '@/lib/motion';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'razorpay-agent-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  /**
   * Whether a theme has already been applied in this session.
   *
   * The first pass is the page adopting the stored theme, which is not a switch and
   * must not animate: a global colour transition on first paint means the whole app
   * fades from the wrong palette to the right one while the reader watches.
   */
  const applied = useRef(false);

  useEffect(() => {
    const root = document.documentElement;

    /**
     * Spec section 35. A theme change is a colour crossfade and nothing else - no
     * circular wipe, no ripple, no reveal. The transition lives in CSS behind
     * `html[data-theme-switching]` and is carried by this attribute for the length of
     * the change only, so the app is not holding a global colour transition during
     * ordinary use, where it would smear every hover state on every surface.
     *
     * The attribute has to be in the *before-change* style for the browser to have
     * something to interpolate from, so it is set, the style is flushed, and only then
     * do the colours move. Setting both in one task means one recalculation, and one
     * recalculation is an instant swap.
     */
    if (applied.current) {
      root.setAttribute('data-theme-switching', '');
      void root.offsetWidth;
    }
    applied.current = true;

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    const timer = window.setTimeout(
      () => root.removeAttribute('data-theme-switching'),
      duration('micro'),
    );
    return () => {
      window.clearTimeout(timer);
      root.removeAttribute('data-theme-switching');
    };
  }, [effectiveTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
  };

  const toggleTheme = () => {
    if (effectiveTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { effectiveTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'border-line bg-surface text-muted hover:bg-surface-subtle hover:text-ink focus-visible:outline-accent motion-fast relative flex size-9 items-center justify-center rounded-lg border transition-[background-color,color,border-color,transform] motion-safe:active:scale-95',
        className,
      )}
    >
      {/* The icon that appears is the one you would switch TO, so it fades in rather
          than the pair cross-rotating: two icons swapping places would be a decorative
          animation on a control whose meaning is which of them is showing. */}
      {effectiveTheme === 'dark' ? (
        <Sun className="animate-fade-in motion-micro size-4 text-amber-400 transition-transform motion-safe:hover:rotate-45" />
      ) : (
        <Moon className="animate-fade-in motion-micro size-4 text-blue-600 transition-transform motion-safe:hover:-rotate-12" />
      )}
    </button>
  );
}

export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const options: Array<{
    value: Theme;
    label: string;
    icon: typeof Sun;
    activeIconColor: string;
  }> = [
    { value: 'light', label: 'Light', icon: Sun, activeIconColor: 'text-amber-500' },
    { value: 'dark', label: 'Dark', icon: Moon, activeIconColor: 'text-blue-500' },
    { value: 'system', label: 'System', icon: Monitor, activeIconColor: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={cn(
        'inline-flex items-center rounded-xl border border-line bg-surface-subtle p-1 shadow-xs',
        className,
      )}
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'motion-fast relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color]',
              active
                ? 'bg-surface text-ink font-semibold shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : 'text-muted hover:bg-surface/60 hover:text-ink',
            )}
          >
            <Icon className={cn('size-3.5', active ? opt.activeIconColor : 'text-faint')} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
