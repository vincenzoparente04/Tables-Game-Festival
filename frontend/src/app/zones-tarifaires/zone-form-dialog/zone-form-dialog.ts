import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ZoneTarifaireDto } from '../../types/zone-tarifaire-dto';

interface DialogData {
  festivalId: number;
  zone?: ZoneTarifaireDto;
}

@Component({
  selector: 'app-zone-form-dialog',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule],
  templateUrl: './zone-form-dialog.html',
  styleUrl: './zone-form-dialog.css',
})
export class ZoneFormDialog {
  private dialogRef = inject(MatDialogRef<ZoneFormDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  isEdit = signal(false);
  submitLabel = signal('Créer');

  form = new FormGroup({
    nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    nombre_tables_total: new FormControl(0, {validators: [Validators.required, Validators.min(1)], nonNullable: true }),
    prix_table: new FormControl(0, {validators: [Validators.required, Validators.min(0)], nonNullable: true }),
    prix_m2: new FormControl(0, {validators: [Validators.min(0)], nonNullable: true})
  });

  constructor() {
    if (this.data.zone) {
      this.isEdit.set(true);
      this.submitLabel.set('Modifier');
      this.form.patchValue({
        nom: this.data.zone.nom,
        nombre_tables_total: this.data.zone.nombre_tables_total,
        prix_table: this.data.zone.prix_table,
        prix_m2: this.data.zone.prix_m2
      });
    }
    this.form.get('prix_table')?.valueChanges.subscribe(value => {
      if (value > 0) {
        this.form.get('prix_m2')?.setValue(value / 4.5, { emitEvent: false });
      }
    });
    
  }

  onSubmit() {
    if (this.form.invalid) return;

    const formData = {
      nom: this.form.value.nom!,
      nombre_tables_total: this.form.value.nombre_tables_total!,
      prix_table: this.form.value.prix_table!,
      prix_m2: this.form.value.prix_m2!
    };

    this.dialogRef.close({
      action: this.isEdit() ? 'edit' : 'create',
      data: formData,
      zoneId: this.data.zone?.id
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
