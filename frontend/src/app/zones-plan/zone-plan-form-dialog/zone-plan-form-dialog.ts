import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ZonePlanDto } from '../../types/zone-plan-dto';

interface DialogData {
  festivalId: number;
  zone?: ZonePlanDto;
}


@Component({
  selector: 'app-zone-plan-form-dialog',
  standalone : true,
  imports: [CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule],
  templateUrl: './zone-plan-form-dialog.html',
  styleUrl: './zone-plan-form-dialog.css',
})
export class ZonePlanFormDialog {
  private dialogRef = inject(MatDialogRef<ZonePlanFormDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  isEdit = signal(false);
  submitLabel = signal('Créer');

  form = new FormGroup({
    nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    nombre_tables_total: new FormControl(0, { validators: [Validators.required, Validators.min(1)], nonNullable: true })
  });

  constructor() {
    if (this.data.zone) {
      this.isEdit.set(true);
      this.submitLabel.set('Modifier');
      this.form.patchValue({
        nom: this.data.zone.nom,
        nombre_tables_total: this.data.zone.nombre_tables_total
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.dialogRef.close({
      action: this.isEdit() ? 'edit' : 'create',
      data: this.form.value,
      zoneId: this.data.zone?.id
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
