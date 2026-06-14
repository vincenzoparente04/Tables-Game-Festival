import { Component, inject } from '@angular/core'
import { Icon } from './icon'
import { ThemeService } from '../core/theme.service'

// Pill-style theme switch: a knob slides left↔right carrying the active icon
// (moon in dark, sun in light); the opposite side shows the other icon muted.
// Ported from a React/Tailwind/lucide snippet to Angular + the app's Icon set
// and ThemeService (no Tailwind, no extra deps).
@Component({
  selector: 'app-theme-toggle',
  imports: [Icon],
  template: `
    <div class="tt" [class.light]="theme.isLight()" (click)="theme.toggle()"
         role="button" tabindex="0"
         (keydown.enter)="theme.toggle()"
         (keydown.space)="$event.preventDefault(); theme.toggle()"
         [attr.aria-label]="theme.isLight() ? 'Switch to dark theme' : 'Switch to light theme'">
      <div class="row">
        <div class="c a">
          @if (theme.isLight()) { <app-icon name="sun" [size]="14" /> }
          @else { <app-icon name="moon" [size]="14" /> }
        </div>
        <div class="c b">
          @if (theme.isLight()) { <app-icon name="moon" [size]="14" /> }
          @else { <app-icon name="sun" [size]="14" /> }
        </div>
      </div>
    </div>
  `,
  styles: `
    .tt { width: 64px; height: 32px; padding: 4px; border-radius: 999px; cursor: pointer; box-sizing: border-box;
          border: 1px solid #27272a; background: #09090b; transition: background .3s, border-color .3s; }
    .tt.light { background: #ffffff; border-color: #e4e4e7; }
    .tt:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .row { display: flex; justify-content: space-between; align-items: center; width: 100%; height: 100%; }
    .c { width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center;
         transition: transform .3s, background .3s, color .3s; }
    /* active knob — sits left (moon) in dark, slides right (sun) in light */
    .c.a { background: #27272a; color: #ffffff; transform: translateX(0); }
    .tt.light .c.a { background: #e5e7eb; color: #374151; transform: translateX(32px); }
    /* muted icon on the empty side */
    .c.b { background: transparent; color: #6b7280; transform: translateX(0); }
    .tt.light .c.b { color: #111111; transform: translateX(-32px); }
  `,
})
export class ThemeToggle {
  readonly theme = inject(ThemeService)
}
