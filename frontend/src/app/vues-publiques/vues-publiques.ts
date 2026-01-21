import { Component , signal, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VuesPubliquesService, JeuPublicFestival, EditeurFestivalPublic } from '../services/vues-publiques-service';
import { PermissionsService } from '../services/permissions-service';

@Component({
  selector: 'app-vues-publiques',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vues-publiques.html',
  styleUrl: './vues-publiques.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VuesPubliques{
  viewMode: 'jeux' | 'editeurs' = 'jeux';
  private readonly vuesService = inject(VuesPubliquesService);
  private readonly permissionsService = inject(PermissionsService);
  
  // Festival info
  festivalCourant = signal<any>(null);
  
  // games
  jeuxFestival = signal<JeuPublicFestival[]>([]);
  loadingJeux = signal(false);
  errorJeux = signal<string | null>(null);

  // editor
  editeursFestival = signal<EditeurFestivalPublic[]>([]);
  loadingEditeurs = signal(false);
  errorEditeurs = signal<string | null>(null);

  // map to link editors and their game's list
  private jeuxParEditeur = new Map<number, string[]>();

  // preview settings and field to keep track of wich users are expanded ("see more")
  maxJeuxPreview = 3;
  private expandedEditeurs = new Set<number>();

  constructor() {
    this.loadFestivalCourant();
    this.loadJeuxFestival();
  }

  isVisitorOrBenevole(): boolean {
    const role = this.permissionsService.currentRole();
    return role === 'visiteur' || role === 'benevole';
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  // load current festival info
  private loadFestivalCourant(): void {
    this.vuesService.getFestivalCourant().subscribe({
      next: (festival) => {
        this.festivalCourant.set(festival);
      },
      error: (err) => {
        console.error('Erreur chargement festival courant:', err);
      }
    });
  }


  // set view - good practice is to use the two if to avoid uploading everything from backend at every change
  // like this we only upload the first time you access this window (no double calls)
  setViewMode(mode: 'jeux' | 'editeurs'): void {
    this.viewMode = mode;

    if (mode === 'jeux' && this.jeuxFestival().length === 0 && !this.loadingJeux()) {
      this.loadJeuxFestival();
    }
    if (mode === 'editeurs' && this.editeursFestival().length === 0 && !this.loadingEditeurs()) {
      this.loadEditeursFestival();
    }
  }

  // load jeux
  private loadJeuxFestival(): void {
    this.loadingJeux.set(true);
    this.errorJeux.set(null);

    this.vuesService.getJeuxFestivalCourant().subscribe({
      next: (data) => {
        this.jeuxFestival.set(data);
        this.loadingJeux.set(false);

        // if we already have editors we update the map
        if (this.editeursFestival().length > 0) {
          this.buildJeuxParEditeur();
        }
      },
      error: (err) => {
        console.error(err);
        this.errorJeux.set('Erreur lors du chargement des jeux du festival courant');
        this.loadingJeux.set(false);
      }
    });
  }

  // load éditeurs
  private loadEditeursFestival(): void {
    this.loadingEditeurs.set(true);
    this.errorEditeurs.set(null);
    this.vuesService.getEditeursFestivalCourant().subscribe({
      next: (data) => {
        this.editeursFestival.set(data);
        this.loadingEditeurs.set(false);

        // every time we upload editors we build/update the map
        this.buildJeuxParEditeur()
      },
      error: (err) => {
        console.error(err);
        this.errorEditeurs.set('Erreur lors du chargement des éditeurs du festival courant');
        this.loadingEditeurs.set(false);
      }
    });
  }

  // build the map editor_id and list of games
  private buildJeuxParEditeur(): void {
    this.jeuxParEditeur.clear();

    if (this.editeursFestival().length === 0 || this.jeuxFestival().length === 0) {
      return;
    }

    for (const editeur of this.editeursFestival()) {
      const jeux = this.jeuxFestival()
        .filter(j => j.editeur_id === editeur.editeur_id)
        .map(j => j.jeu_nom)
        .sort((a, b) => a.localeCompare(b));

      this.jeuxParEditeur.set(editeur.editeur_id, jeux);
    }
  }


  // helpers for the button "see more" in the template

  getJeuxPreview(editeur: EditeurFestivalPublic): string[] {
    const jeux = this.jeuxParEditeur.get(editeur.editeur_id) ?? [];
    if (this.isExpanded(editeur)) {
      return jeux; // all games if the editor is expanded
    }
    return jeux.slice(0, this.maxJeuxPreview); // only the first 3 games otherwise
  }

  // to count the numbers of games of the editor
  getJeuxCount(editeur: EditeurFestivalPublic): number {
    const jeux = this.jeuxParEditeur.get(editeur.editeur_id) ?? [];
    return jeux.length;
  }

  // to check if the editor has more than three games --> decide if showing the button or not
  hasMoreJeux(editeur: EditeurFestivalPublic): boolean {
    return this.getJeuxCount(editeur) > this.maxJeuxPreview;
  }

  // to check if the editor is expanded
  isExpanded(editeur: EditeurFestivalPublic): boolean {
    return this.expandedEditeurs.has(editeur.editeur_id);
  }

  // the actual function called by the button: if the editor is expanded close the extra list; otherwise expands the editor
  toggleJeux(editeur: EditeurFestivalPublic): void {
    if (this.expandedEditeurs.has(editeur.editeur_id)) {
      this.expandedEditeurs.delete(editeur.editeur_id);
    } else {
      this.expandedEditeurs.add(editeur.editeur_id);
    }
  }
}
  

