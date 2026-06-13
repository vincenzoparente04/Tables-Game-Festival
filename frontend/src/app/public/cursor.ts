import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject, viewChild } from '@angular/core'

// Custom trailing cursor for the public site: a ring that follows the pointer
// (lerp, outside Angular zone) and grows + recolors over interactive elements.
// Disabled on touch / coarse pointers; the system cursor is kept underneath.
@Component({
  selector: 'app-cursor',
  template: `<div #ring class="cur" aria-hidden="true"></div>`,
  styles: `
    .cur {
      position: fixed; top: 0; left: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px;
      border: 1.5px solid var(--pub-accent); border-radius: 50%; pointer-events: none; z-index: 9999;
      opacity: 0; will-change: transform;
      transition: width .22s, height .22s, margin .22s, background .22s, border-color .22s, opacity .25s;
    }
    .cur.lg { width: 54px; height: 54px; margin: -27px 0 0 -27px; background: rgba(62, 123, 250, 0.12); }
    @media (prefers-reduced-motion: reduce) { .cur { display: none; } }
  `,
})
export class Cursor implements AfterViewInit, OnDestroy {
  private zone = inject(NgZone)
  private ring = viewChild.required<ElementRef<HTMLDivElement>>('ring')
  private raf = 0
  private cleanup: (() => void)[] = []

  ngAfterViewInit() {
    if (typeof window === 'undefined' || !window.matchMedia?.('(pointer: fine)').matches) return
    const el = this.ring().nativeElement
    let tx = 0, ty = 0, cx = 0, cy = 0

    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      el.style.opacity = '1'
      const hit = (e.target as HTMLElement | null)?.closest('a, button, .pcard, [data-cursor]') as HTMLElement | null
      el.classList.toggle('lg', !!hit)
      el.style.borderColor = hit?.dataset?.['cursor'] || 'var(--pub-accent)'
    }
    const leave = () => { el.style.opacity = '0' }

    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', move, { passive: true })
      document.addEventListener('mouseleave', leave)
      const loop = () => {
        cx += (tx - cx) * 0.2
        cy += (ty - cy) * 0.2
        el.style.transform = `translate(${cx}px, ${cy}px)`
        this.raf = requestAnimationFrame(loop)
      }
      loop()
    })
    this.cleanup.push(() => window.removeEventListener('pointermove', move))
    this.cleanup.push(() => document.removeEventListener('mouseleave', leave))
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf)
    this.cleanup.forEach((fn) => fn())
  }
}
