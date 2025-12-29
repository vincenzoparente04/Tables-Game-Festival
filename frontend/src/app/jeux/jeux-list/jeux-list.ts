import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JeuxService, JeuSummary } from '../../services/jeux-service';
import { EditeursService, EditeurSummary } from '../../services/editeurs-service';
import { JeuxForm } from '../jeux-form/jeux-form';
import { JeuxCard } from '../jeux-card/jeux-card';

@Component({
  selector: 'app-jeux-list',
  standalone: true,
  imports: [CommonModule, JeuxForm, JeuxCard],
  templateUrl: './jeux-list.html',
  styleUrl: './jeux-list.css',
})
export class JeuxList implements OnInit {
  // List of games
  jeux: JeuSummary[] = [];
  loadingList = false;
  errorList: string | null = null;

  // Selected game with details
  selectedJeu: JeuSummary | null = null;
  loadingDetail = false;
  errorDetail: string | null = null;

  // Edit mode
  jeuToEdit: JeuSummary | null = null;

  // List of editors for form
  editeurs: EditeurSummary[] = [];
  loadingEditeurs = false;

  constructor(
    private jeuxService: JeuxService,
    private editeursService: EditeursService
  ) {}

  ngOnInit(): void {
    this.loadJeux();
    this.loadEditeurs();
  }

  // Load the list of games
  private loadJeux(): void {
    this.loadingList = true;
    this.errorList = null;

    this.jeuxService.getJeux().subscribe({
      next: (data: JeuSummary[]) => {
        this.jeux = data;
        this.loadingList = false;
      },
      error: (err) => {
        console.error(err);
        this.errorList = 'Erreur lors du chargement des jeux';
        this.loadingList = false;
      },
    });
  }

  // Load the list of editors
  private loadEditeurs(): void {
    this.loadingEditeurs = true;

    this.editeursService.getEditeurs().subscribe({
      next: (data: EditeurSummary[]) => {
        this.editeurs = data;
        this.loadingEditeurs = false;
      },
      error: (err) => {
        console.error(err);
        this.editeurs = [];
        this.loadingEditeurs = false;
      },
    });
  }

  // Refresh list when a new game is created
  onJeuCreated(): void {
    this.loadJeux();
  }

  // Start creating a new game
  startCreateJeu(): void {
    this.jeuToEdit = {
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
    };
  }

  // Refresh list when a game is updated
  onJeuUpdated(): void {
    this.jeuToEdit = null;
    this.loadJeux();
    this.selectedJeu = null;
  }

  // Select a game to view details
  selectJeu(jeu: JeuSummary): void {
    this.selectedJeu = jeu;
    this.jeuToEdit = null;
    this.errorDetail = null;
    this.loadingDetail = false;
  }

  // Edit mode
  onEditJeu(jeu: JeuSummary): void {
    this.jeuToEdit = jeu;
    this.selectedJeu = null;
  }

  // Delete a game
  onDeleteJeu(jeu: JeuSummary): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le jeu "${jeu.nom}" ?`)) {
      this.jeuxService.deleteJeu(jeu.id).subscribe({
        next: () => {
          this.jeuToEdit = null;
          this.selectedJeu = null;
          this.loadJeux();
        },
        error: (err) => {
          console.error(err);
          this.errorList = err?.error?.error || 'Erreur lors de la suppression du jeu';
        },
      });
    }
  }
}
