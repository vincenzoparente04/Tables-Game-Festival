import { Component, input, output, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { JeuxService, JeuSummary, CreateJeuPayload } from '../../services/jeux-service';
import { EditeurSummary } from '../../services/editeurs-service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-jeux-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './jeux-form.html',
  styleUrl: './jeux-form.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class JeuxForm {
  private readonly jeuxService = inject(JeuxService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  jeu = input<JeuSummary | null>(null);
  editeurs = input<EditeurSummary[]>([]);
  jeuCreated = output<void>();
  jeuUpdated = output<void>();

  loading = signal(false);
  submitLabel = signal('Créer le jeu');
  
  // Manage authors separately as signals
  auteurs = signal<Array<{ nom: string; prenom: string }>>([
    { nom: '', prenom: '' }
  ]);

  form!: FormGroup;

  constructor() {
    this.initializeForm();
    
    effect(() => {
      const currentJeu = this.jeu();
      if (currentJeu && currentJeu.id && currentJeu.id > 0) {
        this.loadEditMode(currentJeu);
      } else {
        this.resetForm();
      }
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      editeur_id: [null as number | null, Validators.required],
      type_jeu: [''],
      age_mini: [null as number | null],
      age_maxi: [null as number | null],
      joueurs_mini: [null as number | null],
      joueurs_maxi: [null as number | null],
      taille_table: [''],
      duree_moyenne: [null as number | null],
    });
  }

  private loadEditMode(jeu: JeuSummary): void {
    this.submitLabel.set('Modifier le jeu');
    this.form.patchValue({
      nom: jeu.nom,
      editeur_id: jeu.editeur_id,
      type_jeu: jeu.type_jeu || '',
      age_mini: jeu.age_mini,
      age_maxi: jeu.age_maxi,
      joueurs_mini: jeu.joueurs_mini,
      joueurs_maxi: jeu.joueurs_maxi,
      taille_table: jeu.taille_table || '',
      duree_moyenne: jeu.duree_moyenne,
    });

    // Set authors from jeu
    if (jeu.auteurs && jeu.auteurs.length > 0) {
      this.auteurs.set(jeu.auteurs.map(a => ({ nom: a.nom, prenom: a.prenom || '' })));
    } else {
      this.auteurs.set([{ nom: '', prenom: '' }]);
    }
  }

  addAuteur(): void {
    const current = this.auteurs();
    this.auteurs.set([...current, { nom: '', prenom: '' }]);
  }

  removeAuteur(index: number): void {
    const current = this.auteurs();
    if (current.length > 1) {
      this.auteurs.set(current.filter((_, i) => i !== index));
    }
  }

  updateAuteur(index: number, field: 'nom' | 'prenom', value: string): void {
    const current = this.auteurs();
    current[index][field] = value;
    this.auteurs.set([...current]); // Trigger reactivity
  }

  submit(): void {
    // Validate main form
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Le formulaire contient des erreurs. Veuillez les corriger.', 'Fermer', { duration: 5000 });
      return;
    }

    // Validate auteurs
    const auteurs = this.auteurs();
    if (!auteurs || auteurs.length === 0) {
      this.snackBar.open('Au moins un auteur est obligatoire', 'Fermer', { duration: 5000 });
      return;
    }

    const hasEmptyAuteur = auteurs.some(a => !a.nom || a.nom.trim() === '');
    if (hasEmptyAuteur) {
      this.snackBar.open('Tous les auteurs doivent avoir un nom', 'Fermer', { duration: 5000 });
      return;
    }

    this.loading.set(true);
    const formValue = this.form.value;

    const payload: CreateJeuPayload = {
      nom: formValue.nom ?? '',
      editeur_id: formValue.editeur_id ?? 0,
      type_jeu: formValue.type_jeu || undefined,
      age_mini: formValue.age_mini || undefined,
      age_maxi: formValue.age_maxi || undefined,
      joueurs_mini: formValue.joueurs_mini || undefined,
      joueurs_maxi: formValue.joueurs_maxi || undefined,
      taille_table: formValue.taille_table || undefined,
      duree_moyenne: formValue.duree_moyenne || undefined,
      auteurs: auteurs,
    };

    console.log('Payload da inviare:', payload);

    const isEditing = this.jeu()?.id && this.jeu()!.id > 0;
    const operation$ = isEditing
      ? this.jeuxService.updateJeu(this.jeu()!.id, payload)
      : this.jeuxService.createJeu(payload);

    operation$.subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open(isEditing ? 'Jeu modifié' : 'Jeu créé', 'Fermer', { duration: 3000 });
        this.resetForm();
        if (isEditing) {
          this.jeuUpdated.emit();
        } else {
          this.jeuCreated.emit();
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err?.error?.error || 'Erreur lors de l\'enregistrement du jeu';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
        console.error('Erreur création/modification jeu:', err);
      },
    });
  }

  resetForm(): void {
    this.submitLabel.set('Créer le jeu');
    
    // Reset main form
    this.form.reset();
    this.form.enable();
    
    // Reset auteurs
    this.auteurs.set([{ nom: '', prenom: '' }]);
  }

  cancel(): void {
    this.resetForm();
  }
}
