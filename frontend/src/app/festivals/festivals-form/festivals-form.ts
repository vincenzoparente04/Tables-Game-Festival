import { Component, input, effect, inject, Inject, Optional, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FestivalsDto } from '../../types/festivals-dto';
import { FestivalsService } from '../../shared/festivals-service';

@Component({
  selector: 'app-festivals-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatCheckboxModule
  ],
  templateUrl: './festivals-form.html',
  styleUrl: './festivals-form.css'
})
export class FestivalsForm {
  private readonly festivalsService = inject(FestivalsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly dialogRef = inject(MatDialogRef, { optional: true });
  private readonly dialogData = inject<any>(MAT_DIALOG_DATA, { optional: true });

  festivalId = signal<number | null>(null);
  initialData = signal<Partial<FestivalsDto> | null>(null);
  submitLabel = signal('Créer');



  form = new FormGroup({
    nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    espace_tables_total: new FormControl(1, { validators: [Validators.required, Validators.min(1)], nonNullable: true }),
    date_debut: new FormControl('', { nonNullable: true }),
    date_fin: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    stock_tables_standard: new FormControl(0, { nonNullable: true }),
    stock_tables_grandes: new FormControl(0, { nonNullable: true }),
    stock_tables_mairie: new FormControl(0, { nonNullable: true }),
    stock_chaises_standard: new FormControl(0, { nonNullable: true }),
    stock_chaises_mairie: new FormControl(0, { nonNullable: true }),
    prix_prise_electrique: new FormControl(0, { nonNullable: true }),
  });

  constructor() {
    // Si ouvert en modale, récupère les données du festival à éditer
    if (this.dialogData && this.dialogData.festival) {
      this.festivalId.set(this.dialogData.festival.id);
      this.initialData.set(this.dialogData.festival);
      this.submitLabel.set('Modifier');
    }
    effect(() => {
      if (this.initialData()) {
        this.form.patchValue(this.initialData()!);
      }
    });
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const data = {
      nom: v.nom ?? '',
      espace_tables_total: v.espace_tables_total ?? 1,
      date_debut: v.date_debut ?? '',
      date_fin: v.date_fin ?? '',
      description: v.description ?? '',
      stock_tables_standard: v.stock_tables_standard ?? 0,
      stock_tables_grandes: v.stock_tables_grandes ?? 0,
      stock_tables_mairie: v.stock_tables_mairie ?? 0,
      stock_chaises_standard: v.stock_chaises_standard ?? 0,
      stock_chaises_mairie: v.stock_chaises_mairie ?? 0,
      prix_prise_electrique: v.prix_prise_electrique ?? 0,
      //est_actif: v.est_actif ?? true,
    };

    if (this.festivalId() == null) {
      // Création
      this.festivalsService.createFestival(data).subscribe({
        next: () => {
          this.snackBar.open('Festival créé', 'OK', { duration: 2000 });
          if (this.dialogRef) this.dialogRef.close('refresh');
          else this.form.reset({
            nom: '',
            espace_tables_total: 1,
            date_debut: '',
            date_fin: '',
            description: '',
            stock_tables_standard: 0,
            stock_tables_grandes: 0,
            stock_tables_mairie: 0,
            stock_chaises_standard: 0,
            stock_chaises_mairie: 0,
            prix_prise_electrique: 0,
            //est_actif: true,
          });
        },
        error: (err) => {
          this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 3000 });
          console.error(err);
        }
      });
    } else {
      // Edition
      this.festivalsService.update(this.festivalId()!, data).subscribe({
        next: () => {
          this.snackBar.open('Festival modifié', 'OK', { duration: 2000 });
          if (this.dialogRef) this.dialogRef.close('refresh');
        },
        error: (err : any) => {
          this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 3000 });
          console.error(err);
        }
      });
    }
  }
}
