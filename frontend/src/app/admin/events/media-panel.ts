import { Component, effect, inject, input, output, signal } from '@angular/core'
import { EventImagesApi, EventsApi, UploadsApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { EventImage, EventModel } from '../../core/models'

// Hero image + public gallery management, embedded in the event detail page.
@Component({
  selector: 'app-media-panel',
  imports: [],
  template: `
    <div class="card pad">
      <h3>Hero image</h3>
      <div class="hero-row">
        @if (event().hero_image_url) {
          <img class="hero" [src]="event().hero_image_url" alt="Event hero" />
        } @else {
          <div class="hero ph">No hero image — the public page falls back to a gradient.</div>
        }
        @if (canManage()) {
          <div class="hero-actions">
            <label class="btn btn-sm">
              {{ uploadingHero() ? 'Uploading…' : (event().hero_image_url ? 'Replace' : 'Upload hero') }}
              <input type="file" accept="image/*" hidden (change)="onHeroFile($event)" [disabled]="uploadingHero()" />
            </label>
            @if (event().hero_image_url) { <button class="btn btn-sm" (click)="removeHero()">Remove</button> }
          </div>
        }
      </div>

      <h3 class="gal-title">Gallery <span class="muted">({{ gallery().length }})</span></h3>
      @if (canManage()) {
        <label class="btn btn-sm add-btn">
          {{ uploadingGallery() ? 'Uploading…' : '+ Add photo' }}
          <input type="file" accept="image/*" hidden (change)="onGalleryFile($event)" [disabled]="uploadingGallery()" />
        </label>
      }
      @if (error()) { <div class="err">{{ error() }}</div> }
      <div class="grid">
        @for (img of gallery(); track img.id; let i = $index, last = $last) {
          <figure class="shot">
            <img [src]="img.url" [alt]="img.alt || 'Event photo'" />
            @if (canManage()) {
              <figcaption class="shot-actions">
                <button class="icon-btn" [disabled]="i === 0" (click)="move(i, -1)">←</button>
                <button class="icon-btn" [disabled]="last" (click)="move(i, 1)">→</button>
                <button class="icon-btn danger" (click)="remove(img)">✕</button>
              </figcaption>
            }
          </figure>
        } @empty {
          <div class="muted">No photos yet.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .pad { padding: 20px 22px; }
    .hero-row { display: flex; align-items: flex-start; gap: 14px; margin: 10px 0 18px; flex-wrap: wrap; }
    .hero { width: 320px; max-width: 100%; aspect-ratio: 16/7; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }
    .hero.ph { display: grid; place-items: center; background: var(--surface-2); color: var(--text-muted); font-size: 13px; padding: 12px; text-align: center; }
    .hero-actions { display: flex; flex-direction: column; gap: 8px; }
    .gal-title { margin-bottom: 8px; }
    .add-btn { margin-bottom: 12px; display: inline-block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .shot { position: relative; margin: 0; }
    .shot img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
    .shot-actions { position: absolute; bottom: 6px; right: 6px; display: flex; gap: 4px; }
    .icon-btn { border: none; background: rgba(255,255,255,0.92); border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 12px; }
    .icon-btn:disabled { opacity: 0.4; cursor: default; }
    .icon-btn.danger { color: var(--danger); }
    .err { color: var(--danger); font-size: 13px; margin-bottom: 8px; }
  `,
})
export class MediaPanel {
  readonly event = input.required<EventModel>()
  readonly updated = output<EventModel>()

  private eventsApi = inject(EventsApi)
  private imagesApi = inject(EventImagesApi)
  private uploads = inject(UploadsApi)
  private perms = inject(PermissionsService)

  readonly gallery = signal<EventImage[]>([])
  readonly uploadingHero = signal(false)
  readonly uploadingGallery = signal(false)
  readonly error = signal('')
  readonly canManage = this.perms.can('eventImages', 'manage')

  constructor() {
    effect(() => {
      const id = this.event().id
      if (id) this.load(id)
    })
  }

  private load(eventId: number) {
    this.imagesApi.list(eventId).subscribe((imgs) =>
      this.gallery.set(imgs.filter((i) => i.kind === 'gallery')),
    )
  }

  onHeroFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploadingHero.set(true)
    this.error.set('')
    this.uploads.upload(file, this.event().id).subscribe({
      next: (img) => {
        this.eventsApi.update(this.event().id, { hero_image_url: img.url }).subscribe((e) => {
          this.uploadingHero.set(false)
          this.updated.emit(e)
        })
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Upload failed'); this.uploadingHero.set(false) },
    })
  }

  removeHero() {
    this.eventsApi.update(this.event().id, { hero_image_url: null }).subscribe((e) => this.updated.emit(e))
  }

  onGalleryFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploadingGallery.set(true)
    this.error.set('')
    this.uploads.upload(file, this.event().id).subscribe({
      next: (img) => {
        this.imagesApi.create({
          event_id: this.event().id, url: img.url, public_id: img.public_id,
          position: this.gallery().length,
        }).subscribe(() => {
          this.uploadingGallery.set(false)
          this.load(this.event().id)
        })
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Upload failed'); this.uploadingGallery.set(false) },
    })
  }

  move(index: number, delta: number) {
    const list = this.gallery()
    const a = list[index]
    const b = list[index + delta]
    if (!a || !b) return
    this.imagesApi.update(a.id, { position: index + delta }).subscribe(() => {
      this.imagesApi.update(b.id, { position: index }).subscribe(() => this.load(this.event().id))
    })
  }

  remove(img: EventImage) {
    if (confirm('Remove this photo?')) {
      this.imagesApi.remove(img.id).subscribe(() => this.load(this.event().id))
    }
  }
}
