import { Component, ElementRef, OnInit, effect, inject, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { EventArtistsApi, EventImagesApi, EventsApi, UploadsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { EventSelector } from '../../shared/event-selector'

// Poster builder: pick a layout, tweak the texts/accent, export a print-ready
// PNG (2x) or save it straight into the event gallery as a poster.
// The SVG uses system fonts on purpose: web fonts are not available inside
// rasterised SVG images, so what you see is exactly what exports.

type TemplateKey = 'aurora' | 'photo' | 'minimal'

@Component({
  selector: 'app-poster-page',
  imports: [FormsModule, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Poster builder</h1><p class="muted">Design a share-ready poster from your event data.</p></div>
    </div>
    <div class="toolbar"><app-event-selector /></div>

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else {
      <div class="layout">
        <div class="card pad controls">
          <label class="field">Template
            <select class="select" [(ngModel)]="form.template">
              <option value="aurora">Aurora (gradient)</option>
              <option value="photo">Photo hero</option>
              <option value="minimal">Minimal light</option>
            </select>
          </label>
          <label class="field">Title
            <input class="input" [(ngModel)]="form.title" />
          </label>
          <label class="field">Subtitle
            <input class="input" [(ngModel)]="form.subtitle" />
          </label>
          <label class="field">Dates line
            <input class="input" [(ngModel)]="form.dates" placeholder="12–14 July 2026" />
          </label>
          <label class="field">Venue line
            <input class="input" [(ngModel)]="form.venue" placeholder="Parco Nord, Milano" />
          </label>
          <label class="field">Lineup (one name per line)
            <textarea class="input" rows="6" [(ngModel)]="form.lineupText"></textarea>
          </label>
          <label class="field">Accent color
            <input class="color" type="color" [(ngModel)]="form.accent" />
          </label>
          <div class="actions">
            <button class="btn btn-primary" (click)="download()" [disabled]="busy()">
              {{ busy() ? 'Rendering…' : 'Download PNG' }}
            </button>
            <button class="btn" (click)="saveToGallery()" [disabled]="busy()">Save to gallery</button>
          </div>
          @if (message()) { <div class="msg">{{ message() }}</div> }
        </div>

        <div class="preview">
          <svg #poster width="800" height="1132" viewBox="0 0 800 1132" xmlns="http://www.w3.org/2000/svg" class="poster">
            @switch (form.template) {
              @case ('aurora') {
                <rect width="800" height="1132" fill="#0b0d14" />
                <circle cx="650" cy="160" r="320" [attr.fill]="form.accent" opacity="0.35" />
                <circle cx="80" cy="980" r="380" [attr.fill]="form.accent" opacity="0.22" />
                <circle cx="720" cy="1060" r="200" fill="#db2777" opacity="0.25" />
                <text x="60" y="120" fill="#ffffff" opacity="0.85" font-size="26" font-weight="700" [attr.font-family]="font">{{ form.dates }}</text>
                <text x="60" y="158" [attr.fill]="form.accent" font-size="22" font-weight="600" [attr.font-family]="font">{{ form.venue }}</text>
                @for (line of titleLines(); track $index) {
                  <text x="56" [attr.y]="300 + $index * 96" fill="#ffffff" font-size="88" font-weight="800" [attr.font-family]="font" letter-spacing="-2">{{ line }}</text>
                }
                @if (form.subtitle) {
                  <text x="60" [attr.y]="330 + titleLines().length * 96" fill="#9aa3b5" font-size="28" [attr.font-family]="font">{{ form.subtitle }}</text>
                }
                @for (name of lineup(); track $index) {
                  <text x="60" [attr.y]="560 + $index * 52" [attr.fill]="$index === 0 ? form.accent : '#e8eaf2'"
                        [attr.font-size]="$index === 0 ? 44 : 34" font-weight="700" [attr.font-family]="font">{{ name }}</text>
                }
                <rect x="60" y="1040" width="120" height="6" [attr.fill]="form.accent" />
                <text x="60" y="1086" fill="#9aa3b5" font-size="20" [attr.font-family]="font">tickets &amp; info online</text>
              }
              @case ('photo') {
                <rect width="800" height="1132" fill="#101218" />
                @if (heroUrl()) {
                  <image [attr.href]="heroUrl()" x="0" y="0" width="800" height="1132" preserveAspectRatio="xMidYMid slice" />
                }
                <rect width="800" height="1132" fill="url(#scrim)" />
                <defs>
                  <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0.25" stop-color="#0b0d14" stop-opacity="0.15" />
                    <stop offset="1" stop-color="#0b0d14" stop-opacity="0.96" />
                  </linearGradient>
                </defs>
                <text x="60" y="700" [attr.fill]="form.accent" font-size="26" font-weight="700" [attr.font-family]="font">{{ form.dates }}</text>
                @for (line of titleLines(); track $index) {
                  <text x="56" [attr.y]="790 + $index * 84" fill="#ffffff" font-size="76" font-weight="800" [attr.font-family]="font" letter-spacing="-2">{{ line }}</text>
                }
                <text x="60" [attr.y]="820 + titleLines().length * 84" fill="#cdd3e0" font-size="26" [attr.font-family]="font">{{ lineupInline() }}</text>
                <text x="60" y="1080" fill="#9aa3b5" font-size="22" [attr.font-family]="font">{{ form.venue }}</text>
              }
              @case ('minimal') {
                <rect width="800" height="1132" fill="#f6f2ea" />
                <rect x="34" y="34" width="732" height="1064" fill="none" stroke="#16181f" stroke-width="3" />
                <text x="400" y="180" fill="#16181f" font-size="24" font-weight="600" text-anchor="middle" [attr.font-family]="font" letter-spacing="6">{{ form.dates.toUpperCase() }}</text>
                @for (line of titleLines(); track $index) {
                  <text x="400" [attr.y]="380 + $index * 92" fill="#16181f" font-size="80" font-weight="800" text-anchor="middle" [attr.font-family]="font" letter-spacing="-1">{{ line }}</text>
                }
                <rect x="330" [attr.y]="420 + titleLines().length * 92" width="140" height="8" [attr.fill]="form.accent" />
                @for (name of lineup(); track $index) {
                  <text x="400" [attr.y]="540 + titleLines().length * 92 + $index * 46" fill="#3a3f4c" font-size="30" font-weight="600" text-anchor="middle" [attr.font-family]="font">{{ name }}</text>
                }
                <text x="400" y="1040" fill="#16181f" font-size="24" font-weight="700" text-anchor="middle" [attr.font-family]="font">{{ form.venue }}</text>
              }
            }
          </svg>
        </div>
      </div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .controls { display: flex; flex-direction: column; }
    .color { width: 100%; height: 36px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: #fff; padding: 2px; }
    .actions { display: flex; gap: 10px; margin-top: 4px; }
    .msg { margin-top: 10px; padding: 9px 12px; border-radius: var(--radius-sm); background: var(--success-50); color: var(--success); font-weight: 600; font-size: 13px; }
    .preview { display: flex; justify-content: center; }
    .poster { width: 100%; max-width: 480px; height: auto; border-radius: 12px; box-shadow: var(--shadow-lg); }
  `,
})
export class PosterPage implements OnInit {
  readonly ctx = inject(EventContext)
  private eventsApi = inject(EventsApi)
  private lineupApi = inject(EventArtistsApi)
  private uploads = inject(UploadsApi)
  private imagesApi = inject(EventImagesApi)

  readonly font = 'Arial, Helvetica, sans-serif'
  readonly busy = signal(false)
  readonly message = signal('')
  readonly heroUrl = signal<string | null>(null)

  private poster = viewChild.required<ElementRef<SVGSVGElement>>('poster')

  form = {
    template: 'aurora' as TemplateKey,
    title: '', subtitle: '', dates: '', venue: '',
    lineupText: '', accent: '#6366f1',
  }

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.prefill(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private prefill(eventId: number) {
    this.eventsApi.get(eventId).subscribe((e) => {
      this.form.title = e.name
      this.form.subtitle = e.subtitle ?? ''
      this.form.dates = e.start_date
        ? e.end_date && e.end_date !== e.start_date ? `${e.start_date} → ${e.end_date}` : e.start_date
        : ''
      this.form.venue = [e.venue, e.location_address].filter(Boolean).join(' · ')
      this.heroUrl.set(e.hero_image_url)
      if (e.hero_image_url) this.form.template = 'photo'
    })
    this.lineupApi.list(eventId).subscribe((lineup) => {
      this.form.lineupText = lineup.map((l) => l.artist_name ?? '').filter(Boolean).join('\n')
    })
  }

  // Greedy two-line split so long names stay readable.
  titleLines(): string[] {
    const words = this.form.title.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) return ['']
    const lines: string[] = []
    let current = ''
    for (const w of words) {
      if ((current + ' ' + w).trim().length > 14 && current) {
        lines.push(current)
        current = w
      } else {
        current = (current + ' ' + w).trim()
      }
    }
    lines.push(current)
    return lines.slice(0, 3)
  }

  lineup(): string[] {
    return this.form.lineupText.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8)
  }

  lineupInline(): string {
    return this.lineup().join(' · ')
  }

  private async renderPng(): Promise<Blob> {
    const clone = this.poster().nativeElement.cloneNode(true) as SVGSVGElement
    // Inline the hero photo as a data URL — an external href would taint the canvas.
    const image = clone.querySelector('image')
    if (image) {
      const href = image.getAttribute('href')
      if (href) {
        try {
          const res = await fetch(href)
          const blob = await res.blob()
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          image.setAttribute('href', dataUrl)
        } catch {
          image.remove() // export without the photo rather than failing
        }
      }
    }
    const xml = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('SVG rasterization failed'))
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = 1600
      canvas.height = 2264
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async download() {
    this.busy.set(true)
    this.message.set('')
    try {
      const blob = await this.renderPng()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${this.form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'poster'}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      this.message.set('Export failed — try removing the photo')
    } finally {
      this.busy.set(false)
    }
  }

  async saveToGallery() {
    const eventId = this.ctx.selectedId()
    if (!eventId) return
    this.busy.set(true)
    this.message.set('')
    try {
      const blob = await this.renderPng()
      const file = new File([blob], 'poster.png', { type: 'image/png' })
      this.uploads.upload(file, eventId).subscribe({
        next: (img) => {
          this.imagesApi.create({ event_id: eventId, url: img.url, public_id: img.public_id, kind: 'poster' })
            .subscribe(() => {
              this.message.set('Poster saved to the event gallery')
              this.busy.set(false)
            })
        },
        error: (e) => {
          this.message.set(e?.error?.error ?? 'Upload failed (is Cloudinary configured?)')
          this.busy.set(false)
        },
      })
    } catch {
      this.message.set('Export failed — try removing the photo')
      this.busy.set(false)
    }
  }
}
