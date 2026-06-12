import { Component, effect, inject, input, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ArtistsApi, EventArtistsApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { Artist, EventArtist } from '../../core/models'

// Event lineup editor, embedded in the event detail page: link catalog
// artists to the event, flag headliners, reorder the public billing.
@Component({
  selector: 'app-lineup-panel',
  imports: [FormsModule],
  template: `
    <div class="card pad">
      <div class="head">
        <h3>Lineup <span class="muted">({{ lineup().length }})</span></h3>
        @if (canManage()) {
          <div class="add">
            <select class="select" [(ngModel)]="addArtistId">
              <option [ngValue]="null">Add an artist…</option>
              @for (a of available(); track a.id) { <option [ngValue]="a.id">{{ a.name }} ({{ a.kind }})</option> }
            </select>
            <button class="btn btn-sm btn-primary" (click)="add()" [disabled]="addArtistId === null">Add</button>
          </div>
        }
      </div>

      @for (entry of lineup(); track entry.id; let i = $index, last = $last) {
        <div class="row">
          @if (entry.artist_image_url) { <img class="avatar" [src]="entry.artist_image_url" [alt]="entry.artist_name" /> }
          @else { <div class="avatar ph">🎤</div> }
          <div class="who">
            <strong>{{ entry.artist_name }}</strong>
            <span class="muted kind">{{ entry.artist_kind }}</span>
          </div>
          @if (entry.is_headliner) { <span class="badge badge-warning">★ Headliner</span> }
          <span class="spacer"></span>
          @if (canManage()) {
            <button class="icon-btn" title="Toggle headliner" (click)="toggleHeadliner(entry)">{{ entry.is_headliner ? '★' : '☆' }}</button>
            <button class="icon-btn" title="Move up" [disabled]="i === 0" (click)="move(i, -1)">↑</button>
            <button class="icon-btn" title="Move down" [disabled]="last" (click)="move(i, 1)">↓</button>
            <button class="btn btn-sm btn-danger" (click)="remove(entry)">Remove</button>
          }
        </div>
      } @empty {
        <div class="muted empty-line">No artists in the lineup yet.</div>
      }
    </div>
  `,
  styles: `
    .pad { padding: 20px 22px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .add { display: flex; gap: 8px; }
    .add .select { width: auto; min-width: 220px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .row:last-of-type { border-bottom: none; }
    .avatar { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border); }
    .avatar.ph { display: grid; place-items: center; background: var(--surface-2); }
    .who { display: flex; flex-direction: column; }
    .kind { font-size: 12px; }
    .spacer { flex: 1; }
    .icon-btn { border: 1px solid var(--border); background: var(--surface); border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 14px; }
    .icon-btn:hover:not(:disabled) { background: var(--surface-2); }
    .icon-btn:disabled { opacity: 0.4; cursor: default; }
    .empty-line { padding: 8px 0; }
  `,
})
export class LineupPanel {
  readonly eventId = input.required<number>()

  private api = inject(EventArtistsApi)
  private artistsApi = inject(ArtistsApi)
  private perms = inject(PermissionsService)

  readonly lineup = signal<EventArtist[]>([])
  readonly artists = signal<Artist[]>([])
  readonly canManage = this.perms.can('eventArtists', 'manage')
  addArtistId: number | null = null

  // Catalog artists not yet in the lineup.
  readonly available = signal<Artist[]>([])

  constructor() {
    this.artistsApi.list().subscribe((list) => {
      this.artists.set(list)
      this.refreshAvailable()
    })
    effect(() => {
      const id = this.eventId()
      if (id) this.load(id)
    })
  }

  private load(eventId: number) {
    this.api.list(eventId).subscribe((list) => {
      this.lineup.set(list)
      this.refreshAvailable()
    })
  }

  private refreshAvailable() {
    const taken = new Set(this.lineup().map((l) => l.artist_id))
    this.available.set(this.artists().filter((a) => !taken.has(a.id)))
  }

  add() {
    if (this.addArtistId === null) return
    this.api.add({
      event_id: this.eventId(),
      artist_id: this.addArtistId,
      display_order: this.lineup().length,
    }).subscribe(() => {
      this.addArtistId = null
      this.load(this.eventId())
    })
  }

  toggleHeadliner(entry: EventArtist) {
    this.api.update(entry.id, { is_headliner: !entry.is_headliner }).subscribe(() => this.load(this.eventId()))
  }

  move(index: number, delta: number) {
    const list = this.lineup()
    const a = list[index]
    const b = list[index + delta]
    if (!a || !b) return
    // Swap display positions; the list re-sorts on reload.
    this.api.update(a.id, { display_order: index + delta }).subscribe(() => {
      this.api.update(b.id, { display_order: index }).subscribe(() => this.load(this.eventId()))
    })
  }

  remove(entry: EventArtist) {
    this.api.remove(entry.id).subscribe(() => this.load(this.eventId()))
  }
}
