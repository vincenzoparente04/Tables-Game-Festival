import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReservationDetails } from '../../types/reservation-dto';

interface DialogData {
  reservation: ReservationDetails;
}

@Component({
  selector: 'app-edit-reservation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './edit-reservation-dialog.html',
  styleUrl: './edit-reservation-dialog.css',
})
export class EditReservationDialog {
  private dialogRef = inject(MatDialogRef<EditReservationDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  form = new FormGroup({
    nb_prises_electriques: new FormControl(this.data.reservation.nb_prises_electriques, [Validators.min(0)]),
    remise_tables: new FormControl(this.data.reservation.remise_tables, [Validators.min(0)]),
    remise_montant: new FormControl(this.data.reservation.remise_montant, [Validators.min(0)]),
    viendra_animer: new FormControl(this.data.reservation.viendra_animer),
    notes: new FormControl(this.data.reservation.notes || '')
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  onCancel() {
    this.dialogRef.close();
  }

}
