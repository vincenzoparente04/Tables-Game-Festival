import { Component, input } from '@angular/core'

// Lightweight inline SVG icon set (line style, currentColor). No webfont/CDN:
// every glyph is hand-kept here so it scales crisply and inherits color.
@Component({
  selector: 'app-icon',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" style="display:inline-block;vertical-align:-0.18em;flex:none">
      @switch (name()) {
        @case ('calendar') { <rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /> }
        @case ('map-pin') { <path d="M12 21c4.5-4.2 7-7.6 7-11a7 7 0 1 0-14 0c0 3.4 2.5 6.8 7 11z" /><circle cx="12" cy="10" r="2.5" /> }
        @case ('clock') { <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /> }
        @case ('user') { <circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /> }
        @case ('arrow-right') { <path d="M5 12h14M13 6l6 6-6 6" /> }
        @case ('arrow-left') { <path d="M19 12H5M11 6l-6 6 6 6" /> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7" /> }
        @case ('x') { <path d="M6 6l12 12M18 6L6 18" /> }
        @case ('music') { <path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /> }
        @case ('ticket') { <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" /><path d="M14 7.5v9" stroke-dasharray="1.5 2.5" /> }
        @case ('star') { <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /> }
        @case ('palette') { <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.6 0-.8.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-3.9-3.8-7.2-9-7.2z" /><circle cx="8" cy="11" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="16" cy="11" r="1" /> }
        @case ('sparkles') { <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18.5 14.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" /> }
        @case ('info') { <circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /> }
        @case ('mail') { <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4.5 7.5l7.5 5 7.5-5" /> }
        @case ('refresh') { <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v3.5h-3.5" /> }
        @default { <circle cx="12" cy="12" r="8" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<string>()
  readonly size = input(16)
}
