import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-add-contact-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './add-contact-dialog.html',
  styleUrl: './add-contact-dialog.css',
})
export class AddContactDialog {
  private dialogRef = inject(MatDialogRef<AddContactDialog>);

  form = new FormGroup({
    date_contact: new FormControl(this.getDefaultDateTime(), Validators.required),
    type_contact: new FormControl(''),
    notes: new FormControl('')
  });

  private getDefaultDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  onSubmit() {
    if (this.form.invalid) return;
    
    const formValue = this.form.value;
    this.dialogRef.close({
      date_contact: formValue.date_contact,
      type_contact: formValue.type_contact || undefined,
      notes: formValue.notes || undefined
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

}
