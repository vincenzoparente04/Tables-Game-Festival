import { Component, input } from '@angular/core'

// Lightweight inline SVG icon set (line style, currentColor). No webfont/CDN:
// every glyph is hand-kept here so it scales crisply and inherits color.
// Shared by the public site and the admin shell.
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
        @case ('users') { <circle cx="9" cy="8" r="3.2" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 5a3.2 3.2 0 0 1 0 6M21.5 19a6.5 6.5 0 0 0-4-6" /> }
        @case ('arrow-right') { <path d="M5 12h14M13 6l6 6-6 6" /> }
        @case ('arrow-left') { <path d="M19 12H5M11 6l-6 6 6 6" /> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7" /> }
        @case ('x') { <path d="M6 6l12 12M18 6L6 18" /> }
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('minus') { <path d="M5 12h14" /> }
        @case ('music') { <path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /> }
        @case ('ticket') { <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" /><path d="M14 7.5v9" stroke-dasharray="1.5 2.5" /> }
        @case ('star') { <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /> }
        @case ('palette') { <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.2-1-1.6-1-2.6 0-.8.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-3.9-3.8-7.2-9-7.2z" /><circle cx="8" cy="11" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="16" cy="11" r="1" /> }
        @case ('sparkles') { <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /><path d="M18.5 14.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" /> }
        @case ('info') { <circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /> }
        @case ('mail') { <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4.5 7.5l7.5 5 7.5-5" /> }
        @case ('refresh') { <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v3.5h-3.5" /> }
        @case ('sun') { <circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" /> }
        @case ('moon') { <path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5z" /> }
        @case ('alert') { <path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.5h.01" /> }
        @case ('grid') { <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /> }
        @case ('undo') { <path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12H9" /> }
        @case ('redo') { <path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h5" /> }
        @case ('arrow-up') { <path d="M12 19V5M6 11l6-6 6 6" /> }
        @case ('arrow-down') { <path d="M12 5v14M6 13l6 6 6-6" /> }
        @case ('zoom-in') { <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M11 8v6M8 11h6" /> }
        @case ('zoom-out') { <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M8 11h6" /> }
        @case ('maximize') { <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /> }
        @case ('image') { <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M5 18l5-4 3.5 2.5L17 12l3 3" /> }
        @case ('trash') { <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" /> }
        @default { <circle cx="12" cy="12" r="8" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<string>()
  readonly size = input(16)
}
