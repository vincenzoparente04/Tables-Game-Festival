import { Injectable, computed, signal } from '@angular/core'

type Theme = 'dark' | 'light'

// App-wide theme. Dark is the default identity; light is an opt-in alternative.
// The choice is persisted and applied as a `.theme-light` class on <html>,
// which flips the CSS-variable palette in styles.css.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.initial())
  readonly theme = this._theme.asReadonly()
  readonly isLight = computed(() => this._theme() === 'light')

  constructor() {
    this.apply(this._theme())
  }

  toggle() {
    this.set(this._theme() === 'dark' ? 'light' : 'dark')
  }

  set(theme: Theme) {
    this._theme.set(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // storage may be unavailable (private mode) — non-fatal
    }
    this.apply(theme)
  }

  private initial(): Theme {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // ignore
    }
    return 'dark'
  }

  private apply(theme: Theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('theme-light', theme === 'light')
    }
  }
}
