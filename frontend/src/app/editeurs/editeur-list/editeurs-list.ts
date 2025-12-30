import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditeursService, EditeurSummary, JeuEditeur, ContactEditeur} from '../../services/editeurs-service';
import { EditeursForm } from '../editeurs-form/editeurs-form';
import { EditeurCard } from '../editeur-card/editeur-card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PermissionsService } from '../../services/permissions-service'

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

  readonly canCreate = this.permissions.can('editeurs', 'create');
  readonly canModify = this.permissions.can('editeurs', 'update');
  readonly canDelete = this.permissions.can('editeurs', 'delete');

  constructor() {
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
    this.loadEditeurs();
  }

  // Reset the list when a new editor is modified
  onEditeurUpdated(): void {
    this.editeurToEdit.set(null);
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
          this.snackBar.open('Éditeur supprimé avec succès', 'Fermer', { duration: 3000 });
          this.loadEditeurs();
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
}