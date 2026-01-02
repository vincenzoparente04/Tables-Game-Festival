import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ZonePlanDto, JeuFestivalDto } from '../../types/zone-plan-dto';

interface DialogData {
  //  Placer depuis une zone
  zone?: ZonePlanDto;
  jeuxDisponibles?: JeuFestivalDto[];
  // placer depuis jeux-non-pkacés
  jeu?: JeuFestivalDto;
  zonesDisponibles?: ZonePlanDto[];
}

@Component({
  selector: 'app-placement-jeu-dialog',
  standalone : true,
  imports: [CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule],
  templateUrl: './placement-jeu-dialog.html',
  styleUrl: './placement-jeu-dialog.css',
})
export class PlacementJeuDialog {
  private dialogRef = inject(MatDialogRef<PlacementJeuDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly MAX_TABLES = Number.POSITIVE_INFINITY;
  
  //choisir un jeu de la liste des jeux affichés dans la zone
  modeSelectionJeu = signal(false);
  //choisir une zone de la liste des zones affichées pour le jeu
  modeSelectionZone = signal(false);
  
  jeuxDisponibles: JeuFestivalDto[] = [];
  zonesDisponibles: ZonePlanDto[] = [];

  selectedJeu = signal<JeuFestivalDto | null>(null);
  selectedZone = signal<ZonePlanDto | null>(null);

  form = new FormGroup({
    jeu_festival_id: new FormControl<number | null>(null),
    zone_plan_id: new FormControl<number | null>(null),
    nb_tables_std: new FormControl(0, { validators: [Validators.min(0)], nonNullable: true }),
    nb_tables_gde: new FormControl(0, { validators: [Validators.min(0)], nonNullable: true }),
    nb_tables_mairie: new FormControl(0, { validators: [Validators.min(0)], nonNullable: true })
  });

  
  totalTables = signal(0);

  // Estimation du nombre de tables nécessaires (arrondies supérieurement)
  estimatedTables = computed(() => {
    const jeu = this.selectedJeu();
    return jeu ? Math.ceil(jeu.tables_allouees) : 0;
  });

  constructor() {
    if (this.data.zone && this.data.jeuxDisponibles) {
      this.modeSelectionJeu.set(true);
      this.jeuxDisponibles = this.data.jeuxDisponibles;
      this.selectedZone.set(this.data.zone);
      this.form.patchValue({ zone_plan_id: this.data.zone.id });
      this.form.get('jeu_festival_id')?.setValidators([Validators.required]);
    } else if (this.data.jeu && this.data.zonesDisponibles) {
      this.modeSelectionZone.set(true);
      this.zonesDisponibles = this.data.zonesDisponibles;
      this.selectedJeu.set(this.data.jeu);
      this.form.patchValue({ jeu_festival_id: this.data.jeu.id });
      this.form.get('zone_plan_id')?.setValidators([Validators.required]);
    }

    const calculerTotal = () => {
      const std = this.form.get('nb_tables_std')?.value ?? 0;
      const gde = this.form.get('nb_tables_gde')?.value ?? 0;
      const mairie = this.form.get('nb_tables_mairie')?.value ?? 0;
      this.totalTables.set(std + gde + mairie);
    };
    // Calcul initial
    calculerTotal();

    // Écoute des changements
    this.form.valueChanges.subscribe(calculerTotal);
    

    // quand on selectionne
    effect(() => {
      const jeuId = this.form.get('jeu_festival_id')?.value;
      if (jeuId && this.modeSelectionJeu()) {
        const jeu = this.jeuxDisponibles.find(j => j.id === jeuId);
        if (jeu) {
          this.selectedJeu.set(jeu);
          // Utiliser le signal computed estimatedTables
          this.form.patchValue({ nb_tables_std: this.estimatedTables() });
        }
      }
    });

    effect(() => {
      const zoneId = this.form.get('zone_plan_id')?.value;
      if (zoneId && this.modeSelectionZone()) {
        const zone = this.zonesDisponibles.find(z => z.id === zoneId);
        if (zone) {
          this.selectedZone.set(zone);
        }
      }
    });

  }

  hasError(): boolean {
    const zone = this.selectedZone();
    if (!zone) return false;
    return this.totalTables() > (zone.tables_disponibles || 0);
  }

  onSubmit() {
    if (this.form.invalid || this.totalTables() === 0 || this.hasError()) {
      return;
    }

    this.dialogRef.close({
      jeu_festival_id: this.form.value.jeu_festival_id,
      zone_plan_id: this.form.value.zone_plan_id,
      nb_tables_std: this.form.value.nb_tables_std,
      nb_tables_gde: this.form.value.nb_tables_gde,
      nb_tables_mairie: this.form.value.nb_tables_mairie
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

}
