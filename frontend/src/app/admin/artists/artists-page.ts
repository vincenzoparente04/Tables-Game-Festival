import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ArtistsApi, UploadsApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { Artist, Json } from '../../core/models'

const KINDS = ['musician', 'band', 'dj', 'painter', 'sculptor', 'photographer', 'performer', 'collective', 'other']

@Component({
  selector: 'app-artists-page',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Artists</h1><p class="muted">{{ filtered().length }} of {{ artists().length }} artist(s)</p></div>
      @if (canCreate()) {
        <button class="btn btn-primary" (click)="startCreate()">+ New artist</button>
      }
    </div>

    <div class="toolbar">
      <input class="input search" placeholder="Search artists…" [(ngModel)]="search" />
      <select class="select" [(ngModel)]="kindFilter">
        <option value="">All kinds</option>
        @for (k of kinds; track k) { <option [value]="k">{{ k }}</option> }
      </select>
    </div>

    @if (showForm()) {
      <div class="card pad form-card">
        <h3>{{ editingId() ? 'Edit artist' : 'New artist' }}</h3>
        <div class="form-grid">
          <label class="field">Name *
            <input class="input" [(ngModel)]="form.name" placeholder="e.g. The Nebulas" />
          </label>
          <label class="field">Kind
            <input class="input" [(ngModel)]="form.kind" list="artist-kinds" placeholder="musician" />
            <datalist id="artist-kinds">@for (k of kinds; track k) { <option [value]="k"></option> }</datalist>
          </label>
          <label class="field">Website
            <input class="input" [(ngModel)]="form.website" placeholder="https://…" />
          </label>
          <label class="field">Instagram
            <input class="input" [(ngModel)]="form.instagram" placeholder="https://instagram.com/…" />
          </label>
        </div>
        <label class="field">Bio
          <textarea class="input" rows="3" [(ngModel)]="form.bio" placeholder="Short presentation shown on the public page"></textarea>
        </label>
        <div class="img-row">
          @if (form.image_url) { <img class="thumb" [src]="form.image_url" alt="Artist photo" /> }
          <label class="btn btn-sm">
            {{ uploading() ? 'Uploading…' : (form.image_url ? 'Replace photo' : 'Upload photo') }}
            <input type="file" accept="image/*" hidden (change)="onFile($event)" [disabled]="uploading()" />
          </label>
          @if (form.image_url) { <button class="btn btn-sm" (click)="form.image_url = ''">Remove</button> }
          @if (uploadError()) { <span class="err">{{ uploadError() }}</span> }
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving() || !form.name.trim()">
            {{ saving() ? 'Saving…' : 'Save artist' }}
          </button>
          <button class="btn" (click)="closeForm()">Cancel</button>
          @if (error()) { <span class="err">{{ error() }}</span> }
        </div>
      </div>
    }

    @if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="cards">
        @for (a of filtered(); track a.id) {
          <div class="card artist">
            <div class="head">
              @if (a.image_url) { <img class="avatar" [src]="a.image_url" [alt]="a.name" /> }
              @else { <div class="avatar ph">🎨</div> }
              <div>
                <h3>{{ a.name }}</h3>
                <span class="badge badge-primary">{{ a.kind }}</span>
              </div>
            </div>
            @if (a.bio) { <p class="bio mono">{{ a.bio }}</p> }
            <div class="links">
              @if (linkOf(a, 'website'); as url) { <a [href]="url" target="_blank" rel="noopener" class="link">Website</a> }
              @if (linkOf(a, 'instagram'); as url) { <a [href]="url" target="_blank" rel="noopener" class="link">Instagram</a> }
            </div>
            <div class="row-actions">
              @if (canUpdate()) { <button class="btn btn-sm" (click)="startEdit(a)">Edit</button> }
              @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(a)">Delete</button> }
            </div>
          </div>
        } @empty {
          <div class="card empty">No artists yet. Add the first one to build your lineups.</div>
        }
      </div>
    }
  `,
  styles: `
    .toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
    .search { max-width: 280px; }
    .form-card { margin-bottom: 18px; }
    .form-card h3 { margin-bottom: 12px; }
    .img-row { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
    .thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; border: 1px solid var(--border); }
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .err { color: var(--danger); font-size: 13px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    .artist { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .head { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; border: 1px solid var(--border); }
    .avatar.ph { display: grid; place-items: center; background: var(--surface-2); font-size: 22px; }
    .bio { font-size: 13px; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .links { display: flex; gap: 12px; }
    .links .link { color: var(--primary-600); font-weight: 600; font-size: 13px; }
    .row-actions { display: flex; gap: 8px; margin-top: auto; }
  `,
})
export class ArtistsPage implements OnInit {
  private api = inject(ArtistsApi)
  private uploads = inject(UploadsApi)
  private perms = inject(PermissionsService)

  readonly kinds = KINDS
  readonly artists = signal<Artist[]>([])
  readonly loading = signal(true)
  readonly showForm = signal(false)
  readonly editingId = signal<number | null>(null)
  readonly saving = signal(false)
  readonly uploading = signal(false)
  readonly error = signal('')
  readonly uploadError = signal('')

  search = ''
  kindFilter = ''
  private readonly searchSig = signal('')
  private readonly kindSig = signal('')

  form = { name: '', kind: '', bio: '', image_url: '', website: '', instagram: '' }

  readonly canCreate = this.perms.can('artists', 'create')
  readonly canUpdate = this.perms.can('artists', 'update')
  readonly canDelete = this.perms.can('artists', 'delete')

  readonly filtered = computed(() => {
    const q = this.searchSig().toLowerCase()
    const kind = this.kindSig()
    return this.artists().filter((a) =>
      (!q || a.name.toLowerCase().includes(q)) && (!kind || a.kind === kind),
    )
  })

  ngOnInit() {
    this.load()
  }

  // ngModel writes plain fields; mirror them into signals for computed().
  ngDoCheck() {
    this.searchSig.set(this.search)
    this.kindSig.set(this.kindFilter)
  }

  private load() {
    this.api.list().subscribe((list) => {
      this.artists.set(list)
      this.loading.set(false)
    })
  }

  linkOf(a: Artist, key: string): string | null {
    const value = a.links?.[key]
    return typeof value === 'string' ? value : null
  }

  startCreate() {
    this.editingId.set(null)
    this.form = { name: '', kind: '', bio: '', image_url: '', website: '', instagram: '' }
    this.error.set('')
    this.showForm.set(true)
  }

  startEdit(a: Artist) {
    this.editingId.set(a.id)
    this.form = {
      name: a.name,
      kind: a.kind,
      bio: a.bio ?? '',
      image_url: a.image_url ?? '',
      website: this.linkOf(a, 'website') ?? '',
      instagram: this.linkOf(a, 'instagram') ?? '',
    }
    this.error.set('')
    this.showForm.set(true)
  }

  closeForm() {
    this.showForm.set(false)
    this.editingId.set(null)
  }

  onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploading.set(true)
    this.uploadError.set('')
    this.uploads.upload(file).subscribe({
      next: (img) => { this.form.image_url = img.url; this.uploading.set(false) },
      error: (e) => {
        this.uploadError.set(e?.error?.error ?? 'Upload failed')
        this.uploading.set(false)
      },
    })
  }

  save() {
    const links: Json = {}
    if (this.form.website.trim()) links['website'] = this.form.website.trim()
    if (this.form.instagram.trim()) links['instagram'] = this.form.instagram.trim()
    const body: Json = { name: this.form.name.trim(), links }
    if (this.form.kind.trim()) body['kind'] = this.form.kind.trim()
    if (this.form.bio.trim()) body['bio'] = this.form.bio.trim()
    if (this.form.image_url) body['image_url'] = this.form.image_url

    this.saving.set(true)
    this.error.set('')
    const req = this.editingId() ? this.api.update(this.editingId()!, body) : this.api.create(body)
    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load() },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not save artist')
        this.saving.set(false)
      },
    })
  }

  remove(a: Artist) {
    if (confirm(`Delete "${a.name}"? Lineups referencing it will lose the entry.`)) {
      this.api.remove(a.id).subscribe(() => this.load())
    }
  }
}
