import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core'

// Scroll-reveal: fades + lifts an element into view once, the first time it
// enters the viewport. Pairs with the .reveal/.in CSS in styles.css.
@Directive({ selector: '[appReveal]' })
export class Reveal implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef)
  private obs?: IntersectionObserver

  ngAfterViewInit() {
    const node = this.el.nativeElement
    node.classList.add('reveal')
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('in')
      return
    }
    this.obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            this.obs?.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    this.obs.observe(node)
  }

  ngOnDestroy() {
    this.obs?.disconnect()
  }
}
