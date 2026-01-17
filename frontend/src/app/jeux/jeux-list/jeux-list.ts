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

  jeux = signal<JeuSummary[]>([]);
  editeurs = signal<EditeurSummary[]>([]);
  selectedJeu = signal<JeuSummary | null>(null);
  jeuToEdit = signal<JeuSummary | null>(null);
  loadingList = signal(false);
  loadingEditeurs = signal(false);
  errorList = signal<string | null>(null);
  sortBy = signal<'nom' | 'nom-desc'>('nom');

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
    }
    
    return sorted;
  });

  canCreate = this.permissions.can('jeux', 'create');
  canModify = this.permissions.can('jeux', 'update');
  canDelete = this.permissions.can('jeux', 'delete');

  constructor() {
    this.loadJeux();
    this.loadEditeurs();
  }

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

  onJeuCreated(): void {
    this.jeuToEdit.set(null);
    this.selectedJeu.set(null);
    this.loadJeux();
    this.snackBar.open('Jeu créé avec succès', 'Fermer', { duration: 3000 });
  }

  onJeuUpdated(): void {
    this.jeuToEdit.set(null);
    this.selectedJeu.set(null);
    this.loadJeux();
    this.snackBar.open('Jeu modifié avec succès', 'Fermer', { duration: 3000 });
  }

  selectJeu(jeu: JeuSummary): void {
    this.selectedJeu.set(jeu);
    this.jeuToEdit.set(null);
  }

  onEditJeu(jeu: JeuSummary): void {
    this.jeuToEdit.set(jeu);
    this.selectedJeu.set(null);
  }

  onDeleteJeu(jeu: JeuSummary): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le jeu "${jeu.nom}" ?`)) {
      this.jeuxService.deleteJeu(jeu.id).subscribe({
        next: () => {
          this.jeuToEdit.set(null);
          this.selectedJeu.set(null);
          this.loadJeux();
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

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy.set(value === 'nom' ? 'nom' : 'nom-desc');
  }

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
