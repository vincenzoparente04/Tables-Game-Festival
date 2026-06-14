import { Component, input } from '@angular/core'

// HTML-context version of the map element icons (the canvas draws them inline
// in its SVG; this component is for the palette / properties panels). Same
// glyph vocabulary as map-canvas, currentColor so it can be tinted per kind.
@Component({
  selector: 'app-map-glyph',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" style="display:inline-block;vertical-align:-0.18em">
      @switch (kind()) {
        @case ('stage') { <rect x="4" y="9" width="16" height="9" rx="1" /><path d="M4 9l3-4h10l3 4" /> }
        @case ('stand') { <path d="M5 10h14v8H5z" /><path d="M3 10l2-4h14l2 4z" /> }
        @case ('booth') { <rect x="5" y="5" width="14" height="14" rx="1" /><rect x="8.5" y="8.5" width="7" height="7" /> }
        @case ('table') { <ellipse cx="12" cy="12" rx="7" ry="5" /> }
        @case ('bar') { <path d="M6 5h12l-4.5 6v6" /><path d="M9.5 17h5" /> }
        @case ('food') { <path d="M8 4v6a2 2 0 0 0 4 0V4M10 11v9" /><path d="M16 4c-1.4 0-2 2-2 4.5S15 12 16 12v8" /> }
        @case ('entrance') { <path d="M13 4h5v16h-5" /><path d="M4 12h9M9.5 8.5 13 12l-3.5 3.5" /> }
        @case ('exit') { <path d="M11 4H6v16h5" /><path d="M20 12h-9M16.5 8.5 20 12l-3.5 3.5" /> }
        @case ('wc') { <circle cx="12" cy="5.5" r="2" /><path d="M9 20l1.2-7h3.6L15 20M12 13v7" /> }
        @case ('seating') { <rect x="5" y="10" width="14" height="5" rx="1" /><path d="M7 15v3M17 15v3M5 12h14" /> }
        @case ('info') { <circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /> }
        @case ('decor') { <circle cx="12" cy="9" r="5" /><path d="M12 14v6" /> }
        @case ('custom') { <path d="M12 3l9 9-9 9-9-9z" /> }
        @default { <circle cx="12" cy="12" r="7" /> }
      }
    </svg>
  `,
})
export class MapGlyph {
  readonly kind = input.required<string>()
  readonly size = input(20)
}
