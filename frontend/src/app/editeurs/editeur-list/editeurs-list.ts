import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditeursService, EditeurSummary, JeuEditeur, ContactEditeur} from '../../services/editeurs-service';
import { EditeursForm } from '../editeurs-form/editeurs-form';
import { EditeurCard } from '../editeur-card/editeur-card';

@Component({
  selector: 'app-editeurs-list',
  standalone: true,
  imports: [CommonModule, EditeursForm, EditeurCard],
  templateUrl: './editeurs-list.html',
  styleUrl: './editeurs-list.css',
})
export class EditeursList implements OnInit {
  // List of editors
  editeurs: EditeurSummary[] = [];
  loadingList = false;
  errorList: string | null = null;

  // Selected editor with details
  selectedEditeur: EditeurSummary | null = null;
  jeuxSelected: JeuEditeur[] = [];
  contactsSelected: ContactEditeur[] = [];
  loadingDetail = false;
  errorDetail: string | null = null;

  constructor(private editeursService: EditeursService) {}

  ngOnInit(): void {
    this.loadEditeurs();
  }

  // Upload the list of editors
  private loadEditeurs(): void {
    this.loadingList = true;
    this.errorList = null;

    this.editeursService.getEditeurs().subscribe({
      next: (data: EditeurSummary[]) => {
        this.editeurs = data;
        this.loadingList = false;
      },
      error: (err) => {
        console.error(err);
        this.errorList = 'Erreur lors du chargement des éditeurs';
        this.loadingList = false;
      },
    });
  }

  // Reset the list when a new editor is created 
  onEditeurCreated(): void {
    this.loadEditeurs();
  }

  // Charge the details when a card is selected
  selectEditeur(editeur: EditeurSummary): void {
    this.selectedEditeur = editeur;
    this.jeuxSelected = [];
    this.contactsSelected = [];
    this.errorDetail = null;
    this.loadingDetail = true;

    // Charge the games
    this.editeursService.getJeuxEditeur(editeur.id).subscribe({
      next: (jeux: JeuEditeur[]) => {
        this.jeuxSelected = jeux;
      },
      error: (err) => {
        console.error(err);
        this.errorDetail = "Erreur lors du chargement des jeux de l'éditeur";
      },
    });

    // Charge contacts
    this.editeursService.getContactsEditeur(editeur.id).subscribe({
      next: (contacts: ContactEditeur[]) => {
        this.contactsSelected = contacts;
        this.loadingDetail = false;
      },
      error: (err) => {
        console.error(err);
        this.errorDetail =
          this.errorDetail ||
          'Erreur lors du chargement des contacts de l’éditeur';
        this.loadingDetail = false;
      },
    });
  }
}
