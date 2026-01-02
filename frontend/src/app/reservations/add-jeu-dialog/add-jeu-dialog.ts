import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { JeuxService, JeuSummary } from '../../services/jeux-service';

interface DialogData {
  festivalId: number;
  tablesRestantes: number;
}

@Component({
  selector: 'app-add-jeu-dialog',
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
  templateUrl: './add-jeu-dialog.html',
  styleUrl: './add-jeu-dialog.css',
})
export class AddJeuDialog {
  private dialogRef = inject(MatDialogRef<AddJeuDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);
  private jeuxService = inject(JeuxService);

  tablesRestantes = this.data.tablesRestantes;
  jeux = signal<JeuSummary[]>([]);

  form = new FormGroup({
    jeu_id: new FormControl<number | null>(null, Validators.required),
    nombre_exemplaires: new FormControl(1, [Validators.required, Validators.min(1)]),
    tables_allouees: new FormControl(1, [Validators.required, Validators.min(0.5)])
  });

  constructor() {
    this.loadJeux();
  }

  get depassementTables(): boolean {
    const value = this.form.controls.tables_allouees.value;
    return value !== null && value > this.tablesRestantes;
  }

  private loadJeux() {
    this.jeuxService.getJeux().subscribe({
      next: (jeux) => this.jeux.set(jeux),
      error: (err) => console.error('Erreur chargement jeux:', err)
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    if (this.form.value.tables_allouees! > this.tablesRestantes) return;
    
    this.dialogRef.close(this.form.value);
  }

  onCancel() {
    this.dialogRef.close();
  }

}
