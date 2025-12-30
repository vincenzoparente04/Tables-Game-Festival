import { Component, input, output, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeuxForm {
  private readonly jeuxService = inject(JeuxService);
  private readonly snackBar = inject(MatSnackBar);

  jeu = input<JeuSummary | null>(null);
  editeurs = input<EditeurSummary[]>([]);
  jeuCreated = output<void>();
  jeuUpdated = output<void>();

  loading = signal(false);
  submitLabel = signal('Créer le jeu');

  form = new FormGroup({
    nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    editeur_id: new FormControl<number | null>(null, { validators: [Validators.required] }),
    type_jeu: new FormControl('', { nonNullable: true }),
    age_mini: new FormControl<number | null>(null),
    age_maxi: new FormControl<number | null>(null),
    joueurs_mini: new FormControl<number | null>(null),
    joueurs_maxi: new FormControl<number | null>(null),
    taille_table: new FormControl('', { nonNullable: true }),
    duree_moyenne: new FormControl<number | null>(null),
    auteurs: new FormArray([
      new FormGroup({
        nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
        prenom: new FormControl('', { nonNullable: true }),
      }),
    ]),
  });

  constructor() {
    effect(() => {
      const currentJeu = this.jeu();
      if (currentJeu && currentJeu.id && currentJeu.id > 0) {
        this.loadEditMode(currentJeu);
      } else {
        this.resetForm();
      }
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

    const auteursArray = this.form.get('auteurs') as FormArray;
    auteursArray.clear();
    if (jeu.auteurs && jeu.auteurs.length > 0) {
      jeu.auteurs.forEach((auteur) => {
        auteursArray.push(
          new FormGroup({
            nom: new FormControl(auteur.nom, { validators: [Validators.required], nonNullable: true }),
            prenom: new FormControl(auteur.prenom || '', { nonNullable: true }),
          })
        );
      });
    } else {
      auteursArray.push(
        new FormGroup({
          nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
          prenom: new FormControl('', { nonNullable: true }),
        })
      );
    }
  }

  get auteurs(): FormArray {
    return this.form.get('auteurs') as FormArray;
  }

  addAuteur(): void {
    this.auteurs.push(
      new FormGroup({
        nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
        prenom: new FormControl('', { nonNullable: true }),
      })
    );
  }

  removeAuteur(index: number): void {
    if (this.auteurs.length > 1) {
      this.auteurs.removeAt(index);
    }
  }

  submit(): void {
    if (this.form.invalid) return;

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
      auteurs: (formValue.auteurs as any[]) || [],
    };

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
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        console.error(err);
      },
    });
  }

  resetForm(): void {
    this.submitLabel.set('Créer le jeu');
    this.form.reset({
      nom: '',
      editeur_id: null,
      type_jeu: '',
      age_mini: null,
      age_maxi: null,
      joueurs_mini: null,
      joueurs_maxi: null,
      taille_table: '',
      duree_moyenne: null,
    });

    const auteursArray = this.form.get('auteurs') as FormArray;
    auteursArray.clear();
    auteursArray.push(
      new FormGroup({
        nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
        prenom: new FormControl('', { nonNullable: true }),
      })
    );
  }

  cancel(): void {
    this.resetForm();
  }
}
