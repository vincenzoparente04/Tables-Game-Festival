import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditeursService, EditeurSummary, JeuEditeur, ContactEditeur} from '../../services/editeurs-service';
import { EditeursForm } from '../editeurs-form/editeurs-form';
import { EditeurCard } from '../editeur-card/editeur-card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PermissionsService } from '../../services/permissions-service'


/**
 * Local Store for the editors list.
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
  selector: 'app-editeurs-list',
  standalone: true,
  imports: [CommonModule, EditeursForm, EditeurCard, MatSnackBarModule, MatProgressSpinnerModule],
  templateUrl: './editeurs-list.html',
  styleUrl: './editeurs-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditeursList {
  private readonly editeursService = inject(EditeursService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly permissions = inject(PermissionsService);
  private editeurModificationTimes = new Map<number, number>();
  private readonly STORAGE_KEY = 'editeur_modification_times';
  
// Load modification times from localStorage
  private loadModificationTimesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.editeurModificationTimes = new Map(Object.entries(data).map(([key, value]) => [Number(key), value as number]));
      }
    } catch (error) {
      console.error('Errore nel caricamento dei timestamp da localStorage', error);
    }
  }

  // Save modification times to localStorage
  private saveModificationTimesToStorage(): void {
    try {
      const data = Object.fromEntries(this.editeurModificationTimes);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Errore nel salvataggio dei timestamp in localStorage', error);
    }
  }

  // State signals
  editeurs = signal<EditeurSummary[]>([]);
  loadingList = signal(false);
  errorList = signal<string | null>(null);
  selectedEditeur = signal<EditeurSummary | null>(null);
  jeuxSelected = signal<JeuEditeur[]>([]);
  contactsSelected = signal<ContactEditeur[]>([]);
  loadingDetail = signal(false);
  errorDetail = signal<string | null>(null);
  editeurToEdit = signal<EditeurSummary | null>(null);
  contactsToEdit = signal<ContactEditeur[]>([]);
  sortBy = signal<'nom' | 'nom-desc' | 'recent'>('nom');
  filterBy = signal<'tous' | 'sans-contacts' | 'sans-jeux'>('tous');

  // Computed to sort and filter editors
  editeursTries = computed(() => {
    const editeurs = this.editeurs();
    const sort = this.sortBy();
    const filter = this.filterBy();

    let filtered = editeurs;
    if (filter === 'sans-contacts') {
      filtered = editeurs.filter(e => Number(e.nb_contacts) === 0);
    } else if (filter === 'sans-jeux') {
      filtered = editeurs.filter(e => Number(e.nb_jeux) === 0);
    }

    const sorted = [...filtered];
    
    switch (sort) {
      case 'nom':
        sorted.sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case 'nom-desc':
        sorted.sort((a, b) => b.nom.localeCompare(a.nom));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const timeA = this.editeurModificationTimes.get(a.id) || 0;
          const timeB = this.editeurModificationTimes.get(b.id) || 0;
          return timeB - timeA;
        });
        break;
    }
    
    return sorted;
  });

  readonly canCreate = this.permissions.can('editeurs', 'create');
  readonly canModify = this.permissions.can('editeurs', 'update');
  readonly canDelete = this.permissions.can('editeurs', 'delete');

  constructor() {
    this.loadModificationTimesFromStorage();
    this.loadEditeurs();
  }

  // Upload the list of editors
  private loadEditeurs(): void {
    this.loadingList.set(true);
    this.errorList.set(null);

    this.editeursService.getEditeurs().subscribe({
      next: (data: EditeurSummary[]) => {
        this.editeurs.set(data);
        this.loadingList.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorList.set('Erreur lors du chargement des éditeurs');
        this.loadingList.set(false);
        this.snackBar.open('Erreur lors du chargement des éditeurs', 'Fermer', { duration: 5000 });
      },
    });
  }

  // Reset the list when a new editor is created 
  onEditeurCreated(): void {
    const editeursBefore = new Set(this.editeurs().map(e => e.id));
    this.loadEditeurs();
    
    // After loading, mark new editors as just created
    setTimeout(() => {
      this.editeurs().forEach(editeur => {
        if (!editeursBefore.has(editeur.id) && !this.editeurModificationTimes.has(editeur.id)) {
          this.editeurModificationTimes.set(editeur.id, Date.now());
        }
      });
      this.saveModificationTimesToStorage();
    }, 100);
  }

  // Reset the list when a new editor is modified
  onEditeurUpdated(): void {
    const editeurId = this.editeurToEdit()?.id;
    this.editeurToEdit.set(null);
    if (editeurId) {
      this.editeurModificationTimes.set(editeurId, Date.now());
      this.saveModificationTimesToStorage();
    }
    this.loadEditeurs();
    this.selectedEditeur.set(null);
  }

  // Charge the details when a card is selected
  selectEditeur(editeur: EditeurSummary): void {
    this.selectedEditeur.set(editeur);
    this.jeuxSelected.set([]);
    this.contactsSelected.set([]);
    this.errorDetail.set(null);
    this.loadingDetail.set(true);

    // Charge the games
    this.editeursService.getJeuxEditeur(editeur.id).subscribe({
      next: (jeux: JeuEditeur[]) => {
        this.jeuxSelected.set(jeux);
      },
      error: (err) => {
        console.error(err);
        this.errorDetail.set("Erreur lors du chargement des jeux de l'éditeur");
        this.loadingDetail.set(false);
      },
    });

    // Charge contacts
    this.editeursService.getContactsEditeur(editeur.id).subscribe({
      next: (contacts: ContactEditeur[]) => {
        this.contactsSelected.set(contacts);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorDetail.set('Erreur lors du chargement des contacts de l\'éditeur');
        this.loadingDetail.set(false);
      },
    });
  }

  // Edit mode
  onEditEditeur(editeur: EditeurSummary): void {
    this.editeurToEdit.set(editeur);
    this.selectedEditeur.set(null);
    
    // Load contacts for edit
    this.editeursService.getContactsEditeur(editeur.id).subscribe({
      next: (contacts: ContactEditeur[]) => {
        this.contactsToEdit.set(contacts);
      },
      error: (err) => {
        console.error(err);
        this.contactsToEdit.set([]);
        this.snackBar.open('Erreur lors du chargement des contacts', 'Fermer', { duration: 5000 });
      },
    });
  }

  // Delete editor
  onDeleteEditeur(editeur: EditeurSummary): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'éditeur "${editeur.nom}" ?`)) {
      this.editeursService.deleteEditeur(editeur.id).subscribe({
        next: () => {
          this.editeurToEdit.set(null);
          this.selectedEditeur.set(null);
          const current = this.editeurs();
          this.editeurs.set(current.filter(e => e.id !== editeur.id));
          this.snackBar.open('Éditeur supprimé avec succès', 'Fermer', { duration: 3000 });
        },
        error: (err) => {
          console.error(err);
          const errorMsg = err?.error?.error || 'Erreur lors de la suppression de l\'éditeur';
          this.errorList.set(errorMsg);
          this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
        },
      });
    }
  }

  // Handle sort change
  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortBy.set(value as 'nom' | 'nom-desc' | 'recent');
  }

  // Handle filter change
  onFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterBy.set(value as 'tous' | 'sans-contacts' | 'sans-jeux');
  }
}