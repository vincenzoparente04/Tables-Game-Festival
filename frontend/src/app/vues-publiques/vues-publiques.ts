import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VuesPubliquesService, JeuPublicFestival, EditeurFestivalPublic } from '../services/vues-publiques-service';

@Component({
  selector: 'app-vues-publiques',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vues-publiques.html',
  styleUrl: './vues-publiques.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VuesPubliques {
  private readonly vuesService = inject(VuesPubliquesService);

  // View mode state
  viewMode = signal<'jeux' | 'editeurs'>('jeux');

  // Games data
  jeuxFestival = signal<JeuPublicFestival[]>([]);
  loadingJeux = signal(false);
  errorJeux = signal<string | null>(null);

  // Editors data
  editeursFestival = signal<EditeurFestivalPublic[]>([]);
  loadingEditeurs = signal(false);
  errorEditeurs = signal<string | null>(null);

  // Expanded editors state
  expandedEditeurs = signal<Set<number>>(new Set());

  // Preview settings
  private readonly maxJeuxPreview = 3;

  // Map of editors to their games (computed)
  private jeuxParEditeur = computed(() => {
    const map = new Map<number, string[]>();
    const editeurs = this.editeursFestival();
    const jeux = this.jeuxFestival();

    if (editeurs.length === 0 || jeux.length === 0) {
      return map;
    }

    for (const editeur of editeurs) {
      const jeuxList = jeux
        .filter(j => j.editeur_id === editeur.editeur_id)
        .map(j => j.jeu_nom)
        .sort((a, b) => a.localeCompare(b));
      map.set(editeur.editeur_id, jeuxList);
    }

    return map;
  });

  constructor() {
    // Load initial data when component is created
    effect(() => {
      const mode = this.viewMode();
      if (mode === 'jeux' && this.jeuxFestival().length === 0 && !this.loadingJeux()) {
        this.loadJeuxFestival();
      }
      if (mode === 'editeurs' && this.editeursFestival().length === 0 && !this.loadingEditeurs()) {
        this.loadEditeursFestival();
      }
    });
  }

  setViewMode(mode: 'jeux' | 'editeurs'): void {
    this.viewMode.set(mode);
  }

  private loadJeuxFestival(): void {
    this.loadingJeux.set(true);
    this.errorJeux.set(null);

    this.vuesService.getJeuxFestivalCourant().subscribe({
      next: (data) => {
        this.jeuxFestival.set(data);
        this.loadingJeux.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement jeux:', err);
        this.errorJeux.set('Erreur lors du chargement des jeux du festival courant');
        this.loadingJeux.set(false);
      },
    });
  }

  private loadEditeursFestival(): void {
    this.loadingEditeurs.set(true);
    this.errorEditeurs.set(null);

    this.vuesService.getEditeursFestivalCourant().subscribe({
      next: (data) => {
        this.editeursFestival.set(data);
        this.loadingEditeurs.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement éditeurs:', err);
        this.errorEditeurs.set('Erreur lors du chargement des éditeurs du festival courant');
        this.loadingEditeurs.set(false);
      },
    });
  }

  // Helper methods
  getJeuxPreview(editeur: EditeurFestivalPublic): string[] {
    const jeux = this.jeuxParEditeur().get(editeur.editeur_id) ?? [];
    const expanded = this.expandedEditeurs();
    
    if (expanded.has(editeur.editeur_id)) {
      return jeux; // all games if expanded
    }
    return jeux.slice(0, this.maxJeuxPreview); // first 3 games
  }

  getJeuxCount(editeur: EditeurFestivalPublic): number {
    return this.jeuxParEditeur().get(editeur.editeur_id)?.length ?? 0;
  }

  hasMoreJeux(editeur: EditeurFestivalPublic): boolean {
    return this.getJeuxCount(editeur) > this.maxJeuxPreview;
  }

  isExpanded(editeur: EditeurFestivalPublic): boolean {
    return this.expandedEditeurs().has(editeur.editeur_id);
  }

  toggleJeux(editeur: EditeurFestivalPublic): void {
    const current = this.expandedEditeurs();
    const newSet = new Set(current);

    if (newSet.has(editeur.editeur_id)) {
      newSet.delete(editeur.editeur_id);
    } else {
      newSet.add(editeur.editeur_id);
    }

    this.expandedEditeurs.set(newSet);
  }
}
  

