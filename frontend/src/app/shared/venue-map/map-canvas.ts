import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core'
import type { BackgroundShape, EditorElement } from './venue-elements'
import { kindMeta, snap } from './venue-elements'

type DragMode =
  | { type: 'none' }
  | { type: 'pan'; startClientX: number; startClientY: number; startVx: number; startVy: number; scale: number }
  | { type: 'move'; id: number; offsetX: number; offsetY: number; moved: boolean }
  | { type: 'resize'; id: number; corner: 'nw' | 'ne' | 'sw' | 'se'; orig: { x: number; y: number; width: number; height: number } }

// Presentational SVG venue-map renderer with pan/zoom. In editable mode it
// emits move/resize patches and gesture commits; read-only mode (public site)
// only emits selection. The parent owns the element state.
@Component({
  selector: 'app-map-canvas',
  template: `
    <svg
      #svg
      class="map-svg"
      [class.editable]="editable()"
      [attr.viewBox]="viewBox()"
      preserveAspectRatio="xMidYMid meet"
      (wheel)="onWheel($event)"
      (pointerdown)="onCanvasPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
    >
      <!-- canvas ground -->
      <rect [attr.x]="0" [attr.y]="0" [attr.width]="width()" [attr.height]="height()" class="ground" rx="14" />
      @if (showGrid()) {
        @for (gx of gridXs(); track gx) {
          <line [attr.x1]="gx" [attr.y1]="0" [attr.x2]="gx" [attr.y2]="height()" class="grid-line" />
        }
        @for (gy of gridYs(); track gy) {
          <line [attr.x1]="0" [attr.y1]="gy" [attr.x2]="width()" [attr.y2]="gy" class="grid-line" />
        }
      }

      <!-- decorative template background -->
      @for (bg of background(); track $index) {
        @if (bg.shape === 'ellipse') {
          <ellipse
            [attr.cx]="(bg.x ?? 0) + (bg.width ?? 0) / 2" [attr.cy]="(bg.y ?? 0) + (bg.height ?? 0) / 2"
            [attr.rx]="(bg.width ?? 0) / 2" [attr.ry]="(bg.height ?? 0) / 2"
            [attr.fill]="bg.color ?? '#d8d4c8'" class="bg-shape" />
        } @else {
          <rect
            [attr.x]="bg.x ?? 0" [attr.y]="bg.y ?? 0"
            [attr.width]="bg.width ?? 0" [attr.height]="bg.height ?? 0"
            [attr.fill]="bg.color ?? '#d8d4c8'" rx="8" class="bg-shape" />
        }
        @if (bg.label) {
          <text [attr.x]="(bg.x ?? 0) + (bg.width ?? 0) / 2" [attr.y]="(bg.y ?? 0) + (bg.height ?? 0) / 2"
                class="bg-label">{{ bg.label }}</text>
        }
      }

      <!-- placed elements -->
      @for (el of sorted(); track el.id) {
        <g
          [attr.transform]="'rotate(' + el.rotation + ' ' + (el.x + el.width / 2) + ' ' + (el.y + el.height / 2) + ')'"
          class="el"
          [class.selected]="el.id === selectedId()"
          (pointerdown)="onElementPointerDown($event, el)"
        >
          @if (meta(el.kind).shape === 'ellipse') {
            <ellipse [attr.cx]="el.x + el.width / 2" [attr.cy]="el.y + el.height / 2"
                     [attr.rx]="el.width / 2" [attr.ry]="el.height / 2"
                     [attr.fill]="fillOf(el)" class="el-shape" />
          } @else {
            <rect [attr.x]="el.x" [attr.y]="el.y" [attr.width]="el.width" [attr.height]="el.height"
                  [attr.fill]="fillOf(el)" rx="8" class="el-shape" />
          }
          <text [attr.x]="el.x + el.width / 2" [attr.y]="el.y + el.height / 2 - 4" class="el-glyph"
                [style.font-size.px]="glyphSize(el)">{{ meta(el.kind).glyph }}</text>
          <text [attr.x]="el.x + el.width / 2" [attr.y]="el.y + el.height / 2 + 13" class="el-label">
            {{ displayLabel(el) }}
          </text>
          @if (el.capacity) {
            <text [attr.x]="el.x + el.width / 2" [attr.y]="el.y + el.height - 6" class="el-cap">{{ el.capacity }} 👤</text>
          }
        </g>
      }

      <!-- selection outline + resize handles (unrotated frame) -->
      @if (editable() && selected(); as sel) {
        <rect [attr.x]="sel.x - 3" [attr.y]="sel.y - 3" [attr.width]="sel.width + 6" [attr.height]="sel.height + 6"
              class="sel-outline" rx="10" />
        @for (h of handles(sel); track h.corner) {
          <rect [attr.x]="h.x - hs()" [attr.y]="h.y - hs()" [attr.width]="hs() * 2" [attr.height]="hs() * 2"
                class="handle" [style.cursor]="h.cursor"
                (pointerdown)="onHandlePointerDown($event, sel, h.corner)" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    .map-svg { width: 100%; height: 100%; display: block; background: #eef0f5; border-radius: var(--radius); touch-action: none; user-select: none; }
    .ground { fill: #f7f5ef; stroke: var(--border-strong); stroke-width: 2; }
    .grid-line { stroke: rgba(15, 23, 42, 0.05); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .bg-shape { opacity: 0.55; pointer-events: none; }
    .bg-label { fill: rgba(15, 23, 42, 0.45); font-size: 14px; font-weight: 600; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
    .el-shape { opacity: 0.92; stroke: rgba(15, 23, 42, 0.25); stroke-width: 1; }
    .editable .el { cursor: grab; }
    .el.selected .el-shape { stroke: var(--primary); stroke-width: 2.5; }
    .el-glyph { text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
    .el-label { text-anchor: middle; fill: #fff; font-size: 11px; font-weight: 700; pointer-events: none; paint-order: stroke; stroke: rgba(15, 23, 42, 0.45); stroke-width: 2.5px; }
    .el-cap { text-anchor: middle; fill: #fff; font-size: 10px; font-weight: 600; pointer-events: none; paint-order: stroke; stroke: rgba(15, 23, 42, 0.45); stroke-width: 2px; }
    .sel-outline { fill: none; stroke: var(--primary); stroke-width: 1.5; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; pointer-events: none; }
    .handle { fill: #fff; stroke: var(--primary); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  `,
})
export class MapCanvas {
  readonly width = input.required<number>()
  readonly height = input.required<number>()
  readonly background = input<BackgroundShape[]>([])
  readonly elements = input.required<EditorElement[]>()
  readonly editable = input(false)
  readonly selectedId = input<number | null>(null)
  readonly showGrid = input(false)
  readonly gridSize = input(10)

  // Continuous geometry patches while dragging; commit fires once per gesture.
  readonly select = output<number | null>()
  readonly change = output<{ id: number; patch: Partial<EditorElement> }>()
  readonly gestureStart = output<void>()
  readonly commit = output<void>()

  private svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg')

  // viewBox state (pan/zoom)
  private vx = signal(0)
  private vy = signal(0)
  private vw = signal(0)
  private vh = signal(0)
  private initialised = false
  private drag: DragMode = { type: 'none' }

  readonly viewBox = computed(() => {
    if (!this.initialised || this.vw() === 0) {
      // Start fitted with a small margin.
      const m = 40
      return `${-m} ${-m} ${this.width() + m * 2} ${this.height() + m * 2}`
    }
    return `${this.vx()} ${this.vy()} ${this.vw()} ${this.vh()}`
  })

  // Handle half-size in user units, kept screen-constant-ish via zoom level.
  readonly hs = computed(() => Math.max(4, (this.vw() || this.width()) / 120))

  readonly sorted = computed(() =>
    [...this.elements()].sort((a, b) => a.z_index - b.z_index || a.id - b.id),
  )

  readonly selected = computed(() => {
    const id = this.selectedId()
    return id === null ? null : this.elements().find((e) => e.id === id) ?? null
  })

  readonly gridXs = computed(() => {
    const step = 100
    const xs: number[] = []
    for (let x = step; x < this.width(); x += step) xs.push(x)
    return xs
  })
  readonly gridYs = computed(() => {
    const step = 100
    const ys: number[] = []
    for (let y = step; y < this.height(); y += step) ys.push(y)
    return ys
  })

  meta = kindMeta

  fillOf(el: EditorElement): string {
    return el.color ?? kindMeta(el.kind).color
  }

  glyphSize(el: EditorElement): number {
    return Math.max(12, Math.min(26, Math.min(el.width, el.height) * 0.35))
  }

  displayLabel(el: EditorElement): string {
    return el.label
      ?? el.booking_participant_name
      ?? el.resource_label
      ?? el.area_name
      ?? kindMeta(el.kind).label
  }

  handles(sel: EditorElement) {
    return [
      { corner: 'nw' as const, x: sel.x, y: sel.y, cursor: 'nwse-resize' },
      { corner: 'ne' as const, x: sel.x + sel.width, y: sel.y, cursor: 'nesw-resize' },
      { corner: 'sw' as const, x: sel.x, y: sel.y + sel.height, cursor: 'nesw-resize' },
      { corner: 'se' as const, x: sel.x + sel.width, y: sel.y + sel.height, cursor: 'nwse-resize' },
    ]
  }

  // --- coordinate helpers -------------------------------------------------

  private ensureViewBox(): void {
    if (this.initialised) return
    const m = 40
    this.vx.set(-m)
    this.vy.set(-m)
    this.vw.set(this.width() + m * 2)
    this.vh.set(this.height() + m * 2)
    this.initialised = true
  }

  private toSvgPoint(evt: PointerEvent | WheelEvent): { x: number; y: number } {
    const svg = this.svgRef().nativeElement
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  zoomBy(factor: number, center?: { x: number; y: number }): void {
    this.ensureViewBox()
    const c = center ?? { x: this.vx() + this.vw() / 2, y: this.vy() + this.vh() / 2 }
    const minW = this.width() / 8
    const maxW = this.width() * 4
    const newW = Math.min(maxW, Math.max(minW, this.vw() * factor))
    const ratio = newW / this.vw()
    this.vx.set(c.x - (c.x - this.vx()) * ratio)
    this.vy.set(c.y - (c.y - this.vy()) * ratio)
    this.vw.set(newW)
    this.vh.set(this.vh() * ratio)
  }

  zoomToFit(): void {
    this.initialised = false
    this.vw.set(0)
  }

  // --- pointer interactions ----------------------------------------------

  onWheel(evt: WheelEvent): void {
    evt.preventDefault()
    this.zoomBy(evt.deltaY > 0 ? 1.12 : 1 / 1.12, this.toSvgPoint(evt))
  }

  onCanvasPointerDown(evt: PointerEvent): void {
    // Reaches here only when no element/handle captured the event → pan.
    this.ensureViewBox()
    const svg = this.svgRef().nativeElement
    svg.setPointerCapture(evt.pointerId)
    this.drag = {
      type: 'pan',
      startClientX: evt.clientX,
      startClientY: evt.clientY,
      startVx: this.vx(),
      startVy: this.vy(),
      scale: this.vw() / svg.clientWidth,
    }
    if (this.editable()) this.select.emit(null)
  }

  onElementPointerDown(evt: PointerEvent, el: EditorElement): void {
    evt.stopPropagation()
    this.select.emit(el.id)
    if (!this.editable()) return
    this.ensureViewBox()
    this.svgRef().nativeElement.setPointerCapture(evt.pointerId)
    const p = this.toSvgPoint(evt)
    this.drag = { type: 'move', id: el.id, offsetX: p.x - el.x, offsetY: p.y - el.y, moved: false }
  }

  onHandlePointerDown(evt: PointerEvent, el: EditorElement, corner: 'nw' | 'ne' | 'sw' | 'se'): void {
    evt.stopPropagation()
    this.ensureViewBox()
    this.svgRef().nativeElement.setPointerCapture(evt.pointerId)
    this.gestureStart.emit()
    this.drag = { type: 'resize', id: el.id, corner, orig: { x: el.x, y: el.y, width: el.width, height: el.height } }
  }

  onPointerMove(evt: PointerEvent): void {
    const drag = this.drag
    if (drag.type === 'none') return
    if (drag.type === 'pan') {
      this.vx.set(drag.startVx - (evt.clientX - drag.startClientX) * drag.scale)
      this.vy.set(drag.startVy - (evt.clientY - drag.startClientY) * drag.scale)
      return
    }
    const p = this.toSvgPoint(evt)
    const grid = this.showGrid() ? this.gridSize() : 0
    if (drag.type === 'move') {
      if (!drag.moved) {
        drag.moved = true
        this.gestureStart.emit()
      }
      this.change.emit({
        id: drag.id,
        patch: { x: snap(p.x - drag.offsetX, grid), y: snap(p.y - drag.offsetY, grid) },
      })
      return
    }
    // resize from a corner of the unrotated frame
    const o = drag.orig
    const min = 16
    let x = o.x
    let y = o.y
    let w = o.width
    let h = o.height
    if (drag.corner === 'se') { w = p.x - o.x; h = p.y - o.y }
    if (drag.corner === 'ne') { w = p.x - o.x; h = o.y + o.height - p.y; y = p.y }
    if (drag.corner === 'sw') { w = o.x + o.width - p.x; x = p.x; h = p.y - o.y }
    if (drag.corner === 'nw') { w = o.x + o.width - p.x; x = p.x; h = o.y + o.height - p.y; y = p.y }
    w = Math.max(min, snap(w, grid))
    h = Math.max(min, snap(h, grid))
    if (drag.corner === 'ne' || drag.corner === 'nw') y = o.y + o.height - h
    if (drag.corner === 'sw' || drag.corner === 'nw') x = o.x + o.width - w
    this.change.emit({ id: drag.id, patch: { x: snap(x, grid), y: snap(y, grid), width: w, height: h } })
  }

  onPointerUp(evt: PointerEvent): void {
    const wasGesture = this.drag.type === 'resize' || (this.drag.type === 'move' && this.drag.moved)
    this.drag = { type: 'none' }
    try {
      this.svgRef().nativeElement.releasePointerCapture(evt.pointerId)
    } catch {
      // pointer capture may already be released
    }
    if (wasGesture) this.commit.emit()
  }
}
