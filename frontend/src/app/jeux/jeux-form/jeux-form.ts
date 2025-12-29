import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JeuxService, JeuSummary, CreateJeuPayload, Auteur } from '../../services/jeux-service';
import { EditeurSummary } from '../../services/editeurs-service';

@Component({
  selector: 'app-jeux-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jeux-form.html',
  styleUrl: './jeux-form.css',
})
export class JeuxForm implements OnChanges {
  @Input() jeu?: JeuSummary;
  @Input() editeurs: EditeurSummary[] = [];
  @Output() jeuCreated = new EventEmitter<void>();
  @Output() jeuUpdated = new EventEmitter<void>();

  isEditing = false;
  loading = false;
  error: string | null = null;

  // Form fields
  nom = '';
  editeur_id: number | null = null;
  type_jeu = '';
  age_mini: number | null = null;
  age_maxi: number | null = null;
  joueurs_mini: number | null = null;
  joueurs_maxi: number | null = null;
  taille_table: string = '';
  duree_moyenne: number | null = null;
  auteurs: Auteur[] = [];

  constructor(private jeuxService: JeuxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jeu'] && changes['jeu'].currentValue) {
      // Only load edit mode if jeu has a valid ID (not 0)
      if (this.jeu?.id && this.jeu.id > 0) {
        this.loadEditMode();
      } else {
        this.resetForm();
      }
    }
  }

  private loadEditMode(): void {
    if (!this.jeu || !this.jeu.id || this.jeu.id === 0) return;
    
    this.isEditing = true;
    this.nom = this.jeu.nom;
    this.editeur_id = this.jeu.editeur_id;
    this.type_jeu = this.jeu.type_jeu || '';
    this.age_mini = this.jeu.age_mini || null;
    this.age_maxi = this.jeu.age_maxi || null;
    this.joueurs_mini = this.jeu.joueurs_mini || null;
    this.joueurs_maxi = this.jeu.joueurs_maxi || null;
    this.taille_table = this.jeu.taille_table || '';
    this.duree_moyenne = this.jeu.duree_moyenne || null;
    this.auteurs = this.jeu.auteurs?.map(a => ({ ...a })) || [];
    this.error = null;
  }

  addAuteur(): void {
    this.auteurs.push({ nom: '', prenom: '' });
  }

  removeAuteur(index: number): void {
    this.auteurs.splice(index, 1);
  }

  private validateForm(): string | null {
    if (!this.nom || this.nom.trim() === '') {
      return 'Le nom du jeu est obligatoire';
    }
    if (!this.editeur_id) {
      return 'Un éditeur doit être sélectionné';
    }
    if (this.auteurs.length === 0) {
      return 'Au moins un auteur est obligatoire';
    }
    if (this.auteurs.some(a => !a.nom || a.nom.trim() === '')) {
      return 'Tous les auteurs doivent avoir un nom';
    }
    return null;
  }

  onSubmit(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.error = validationError;
      return;
    }

    this.loading = true;
    this.error = null;

    const payload: CreateJeuPayload = {
      nom: this.nom.trim(),
      editeur_id: this.editeur_id!,
      type_jeu: this.type_jeu || undefined,
      age_mini: this.age_mini || undefined,
      age_maxi: this.age_maxi || undefined,
      joueurs_mini: this.joueurs_mini || undefined,
      joueurs_maxi: this.joueurs_maxi || undefined,
      taille_table: this.taille_table || undefined,
      duree_moyenne: this.duree_moyenne || undefined,
      auteurs: this.auteurs,
    };

    const operation$ = this.isEditing && this.jeu
      ? this.jeuxService.updateJeu(this.jeu.id, payload)
      : this.jeuxService.createJeu(payload);

    operation$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        if (this.isEditing) {
          this.jeuUpdated.emit();
        } else {
          this.jeuCreated.emit();
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Erreur lors de l\'enregistrement du jeu';
        console.error(err);
      },
    });
  }

  resetForm(): void {
    this.nom = '';
    this.editeur_id = null;
    this.type_jeu = '';
    this.age_mini = null;
    this.age_maxi = null;
    this.joueurs_mini = null;
    this.joueurs_maxi = null;
    this.taille_table = '';
    this.duree_moyenne = null;
    this.auteurs = [];
    this.isEditing = false;
    this.error = null;
  }

  cancel(): void {
    this.resetForm();
  }
}
