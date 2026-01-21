import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JeuxService, JeuSummary } from '../../services/jeux-service';
import { EditeursService, EditeurSummary } from '../../services/editeurs-service';
import { JeuxForm } from '../jeux-form/jeux-form';
import { JeuxCard } from '../jeux-card/jeux-card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule } from '@angular/forms';
import { PermissionsService } from '../../services/permissions-service'

/**
 * Local Store for the games list.
 *
 * why
 * - avoid repeated HTTP calls for a large and low-volatility dataset
 * - improve performance and UI responsiveness
 * - preserve the list state across navigation and page refresh
 *
 * Important note:
 * - the backend REST API remains the single source of truth
 * - localStorage is used only as a temporary cache
 * - this can be replaced later by a proper application-level cache
 */

@Component({
  selector: 'app-jeux-list',
  standalone: true,
  imports: [
    CommonModule,
    JeuxForm,
    JeuxCard,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  templateUrl: './jeux-list.html',
  styleUrl: './jeux-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class JeuxList {
  private readonly jeuxService = inject(JeuxService);
  private readonly editeursService = inject(EditeursService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly permissions = inject(PermissionsService);
  private jeuModificationTimes = new Map<number, number>();
  private readonly STORAGE_KEY = 'jeu_modification_times';

  // Load modification times from localStorage
  private loadModificationTimesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.jeuModificationTimes = new Map(Object.entries(data).map(([key, value]) => [Number(key), value as number]));
      }
    } catch (error) {
      console.error('Error loading modification times from localStorage', error);
    }
  }

  // Save modification times to localStorage
  private saveModificationTimesToStorage(): void {
    try {
      const data = Object.fromEntries(this.jeuModificationTimes);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving modification times to localStorage', error);
    }
  }

  jeux = signal<JeuSummary[]>([]);
  editeurs = signal<EditeurSummary[]>([]);
  selectedJeu = signal<JeuSummary | null>(null);
  jeuToEdit = signal<JeuSummary | null>(null);
  loadingList = signal(false);
  loadingEditeurs = signal(false);
  errorList = signal<string | null>(null);
  sortBy = signal<'nom' | 'nom-desc' | 'recent'>('nom');

  jeuxTries = computed(() => {
    const jeux = this.jeux();
    const sort = this.sortBy();

    const sorted = [...jeux];
    
    switch (sort) {
      case 'nom':
        sorted.sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case 'nom-desc':
        sorted.sort((a, b) => b.nom.localeCompare(a.nom));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const timeA = this.jeuModificationTimes.get(a.id) || 0;
          const timeB = this.jeuModificationTimes.get(b.id) || 0;
          return timeB - timeA;
        });
        break;
    }
    
    return sorted;
  });

  canCreate = this.permissions.can('jeux', 'create');
  canModify = this.permissions.can('jeux', 'update');
  canDelete = this.permissions.can('jeux', 'delete');

  constructor() {
    this.loadModificationTimesFromStorage();
    this.loadJeux();
    this.loadEditeurs();
  }

// Load jeux from the service
  private loadJeux(): void {
    this.loadingList.set(true);
    this.errorList.set(null);

    this.jeuxService.getJeux().subscribe({
      next: (data: JeuSummary[]) => {
        this.jeux.set(data);
        this.loadingList.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorList.set('Erreur lors du chargement des jeux');
        this.loadingList.set(false);
      },
    });
  }

  // Load editeurs from the service
  private loadEditeurs(): void {
    this.loadingEditeurs.set(true);

    this.editeursService.getEditeurs().subscribe({
      next: (data: EditeurSummary[]) => {
        this.editeurs.set(data);
        this.loadingEditeurs.set(false);
      },
      error: (err) => {
        console.error(err);
        this.editeurs.set([]);
        this.loadingEditeurs.set(false);
      },
    });
  }

  // Handlers for jeu creation, update, selection, editing, deletion, and sorting
  onJeuCreated(): void {
    const jeusBefore = new Set(this.jeux().map(j => j.id));
    this.jeuToEdit.set(null);
    this.selectedJeu.set(null);
    this.loadJeux();
    
    // After loading, mark new jeux as just created
    setTimeout(() => {
      this.jeux().forEach(jeu => {
        if (!jeusBefore.has(jeu.id) && !this.jeuModificationTimes.has(jeu.id)) {
          this.jeuModificationTimes.set(jeu.id, Date.now());
        }
      });
      this.saveModificationTimesToStorage();
    }, 100);
    
    this.snackBar.open('Jeu créé avec succès', 'Fermer', { duration: 3000 });
  }

  // Handler for jeu update
  onJeuUpdated(): void {
    const jeuId = this.jeuToEdit()?.id;
    this.jeuToEdit.set(null);
    this.selectedJeu.set(null);
    if (jeuId) {
      this.jeuModificationTimes.set(jeuId, Date.now());
      this.saveModificationTimesToStorage();
    }
    this.loadJeux();
    this.snackBar.open('Jeu modifié avec succès', 'Fermer', { duration: 3000 });
  }

  // Handler for selecting a jeu
  selectJeu(jeu: JeuSummary): void {
    this.selectedJeu.set(jeu);
    this.jeuToEdit.set(null);
  }

  // Handler for editing a jeu
  onEditJeu(jeu: JeuSummary): void {
    this.jeuToEdit.set(jeu);
    this.selectedJeu.set(null);
  }

  // Handler for deleting a jeu
  onDeleteJeu(jeu: JeuSummary): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le jeu "${jeu.nom}" ?`)) {
      this.jeuxService.deleteJeu(jeu.id).subscribe({
        next: () => {
          this.jeuToEdit.set(null);
          this.selectedJeu.set(null);
          const current = this.jeux();
          this.jeux.set(current.filter(j => j.id !== jeu.id));
          this.snackBar.open('Jeu supprimé', 'Fermer', { duration: 3000 });
        },
        error: (err) => {
          console.error(err);
          this.errorList.set(err?.error?.error || 'Erreur lors de la suppression du jeu');
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        },
      });
    }
  }

  // Handler for sort change
  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'nom') {
      this.sortBy.set('nom');
    } else if (value === 'nom-desc') {
      this.sortBy.set('nom-desc');
    } else if (value === 'recent') {
      this.sortBy.set('recent');
    }
  }

  // Start creating a new jeu
  startCreateJeu(): void {
    this.jeuToEdit.set({
      id: 0,
      nom: '',
      editeur_id: 0,
      editeur_nom: '',
      type_jeu: null,
      age_mini: null,
      age_maxi: null,
      joueurs_mini: null,
      joueurs_maxi: null,
      taille_table: null,
      duree_moyenne: null,
      auteurs: [],
    });
  }
}
