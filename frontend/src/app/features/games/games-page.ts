import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { AuthorsApi, GamesApi, PublishersApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { Author, Game, Publisher } from '../../core/models'

@Component({
  selector: 'app-games-page',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Games</h1><p class="muted">Catalog of games, publishers and authors (festival module).</p></div>
    </div>

    <div class="sections">
      <div class="card pad games-col">
        <h3>Games</h3>
        @if (canEdit()) {
          <div class="addrow">
            <input class="input" placeholder="Name" name="gn" [(ngModel)]="gForm.name" />
            <select class="select" name="gp" [(ngModel)]="gForm.publisher_id"><option [ngValue]="null">No publisher</option>@for (p of publishers(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }</select>
            <input class="input" type="number" placeholder="Min pl." name="gmin" [(ngModel)]="gForm.min_players" />
            <input class="input" type="number" placeholder="Max pl." name="gmax" [(ngModel)]="gForm.max_players" />
            <input class="input" type="number" placeholder="Min age" name="ga" [(ngModel)]="gForm.min_age" />
            <button class="btn btn-primary btn-sm" (click)="addGame()" [disabled]="!gForm.name.trim()">Add</button>
          </div>
        }
        <table class="table">
          <thead><tr><th>Name</th><th>Publisher</th><th>Players</th><th>Age</th><th></th></tr></thead>
          <tbody>
            @for (g of games(); track g.id) {
              <tr><td><strong>{{ g.name }}</strong></td><td class="muted">{{ g.publisher_id ? pubName()[g.publisher_id] : '—' }}</td>
                <td>{{ g.min_players ?? '?' }}–{{ g.max_players ?? '?' }}</td><td>{{ g.min_age ?? '—' }}</td>
                <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('game', g.id)">✕</button> }</div></td></tr>
            } @empty { <tr><td colspan="5" class="muted">No games.</td></tr> }
          </tbody>
        </table>
      </div>

      <div class="side">
        <div class="card pad">
          <h3>Publishers</h3>
          @if (canEdit()) {
            <div class="addrow"><input class="input" placeholder="Name" name="pn" [(ngModel)]="pForm.name" /><button class="btn btn-primary btn-sm" (click)="addPub()" [disabled]="!pForm.name.trim()">Add</button></div>
          }
          <table class="table"><tbody>
            @for (p of publishers(); track p.id) { <tr><td>{{ p.name }}</td><td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('pub', p.id)">✕</button> }</div></td></tr> }
            @empty { <tr><td class="muted">No publishers.</td></tr> }
          </tbody></table>
        </div>

        <div class="card pad">
          <h3>Authors</h3>
          @if (canEdit()) {
            <div class="addrow"><input class="input" placeholder="First" name="af" [(ngModel)]="aForm.first_name" /><input class="input" placeholder="Last" name="al" [(ngModel)]="aForm.last_name" /><button class="btn btn-primary btn-sm" (click)="addAuthor()" [disabled]="!aForm.last_name.trim()">Add</button></div>
          }
          <table class="table"><tbody>
            @for (a of authors(); track a.id) { <tr><td>{{ a.first_name }} {{ a.last_name }}</td><td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('author', a.id)">✕</button> }</div></td></tr> }
            @empty { <tr><td class="muted">No authors.</td></tr> }
          </tbody></table>
        </div>
      </div>
    </div>
  `,
  styles: `
    .sections { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items: start; }
    @media (max-width: 900px) { .sections { grid-template-columns: 1fr; } }
    .side { display: flex; flex-direction: column; gap: 18px; }
    .addrow { display: flex; gap: 8px; margin: 12px 0 16px; flex-wrap: wrap; }
    .addrow .input, .addrow .select { width: auto; flex: 1; min-width: 70px; }
  `,
})
export class GamesPage implements OnInit {
  private gamesApi = inject(GamesApi)
  private pubApi = inject(PublishersApi)
  private authApi = inject(AuthorsApi)
  private perms = inject(PermissionsService)

  readonly games = signal<Game[]>([])
  readonly publishers = signal<Publisher[]>([])
  readonly authors = signal<Author[]>([])
  readonly canEdit = this.perms.can('games', 'create')
  readonly pubName = computed(() => Object.fromEntries(this.publishers().map((p) => [p.id, p.name])))

  gForm = { name: '', publisher_id: null as number | null, min_players: null as number | null, max_players: null as number | null, min_age: null as number | null }
  pForm = { name: '' }
  aForm = { first_name: '', last_name: '' }

  ngOnInit() { this.loadAll() }

  private loadAll() {
    this.gamesApi.list().subscribe((g) => this.games.set(g))
    this.pubApi.list().subscribe((p) => this.publishers.set(p))
    this.authApi.list().subscribe((a) => this.authors.set(a))
  }

  addGame() {
    const body: Record<string, unknown> = { name: this.gForm.name.trim() }
    if (this.gForm.publisher_id) body['publisher_id'] = this.gForm.publisher_id
    if (this.gForm.min_players != null) body['min_players'] = this.gForm.min_players
    if (this.gForm.max_players != null) body['max_players'] = this.gForm.max_players
    if (this.gForm.min_age != null) body['min_age'] = this.gForm.min_age
    this.gamesApi.create(body).subscribe(() => { this.gForm = { name: '', publisher_id: null, min_players: null, max_players: null, min_age: null }; this.gamesApi.list().subscribe((g) => this.games.set(g)) })
  }
  addPub() { this.pubApi.create({ name: this.pForm.name.trim() }).subscribe(() => { this.pForm = { name: '' }; this.pubApi.list().subscribe((p) => this.publishers.set(p)) }) }
  addAuthor() {
    const body: Record<string, unknown> = { last_name: this.aForm.last_name.trim() }
    if (this.aForm.first_name.trim()) body['first_name'] = this.aForm.first_name.trim()
    this.authApi.create(body).subscribe(() => { this.aForm = { first_name: '', last_name: '' }; this.authApi.list().subscribe((a) => this.authors.set(a)) })
  }
  del(kind: 'game' | 'pub' | 'author', id: number) {
    if (!confirm('Delete this item?')) return
    if (kind === 'game') this.gamesApi.remove(id).subscribe(() => this.gamesApi.list().subscribe((g) => this.games.set(g)))
    if (kind === 'pub') this.pubApi.remove(id).subscribe(() => this.pubApi.list().subscribe((p) => this.publishers.set(p)))
    if (kind === 'author') this.authApi.remove(id).subscribe(() => this.authApi.list().subscribe((a) => this.authors.set(a)))
  }
}
