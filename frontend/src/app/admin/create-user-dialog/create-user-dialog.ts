import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { User } from '../../users/user';
import { UserRole, UserDto } from '../../types/user-dto';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './create-user-dialog.html',
  styleUrl: './create-user-dialog.css',
})
export class CreateUserDialog {
  private usersService = inject(User);
  private dialogRef = inject(MatDialogRef<CreateUserDialog>);

  hidePassword = true;
  availableRoles: UserRole[] = [];
  roleDescriptions: { [key in UserRole]?: string } = {};

  form = new FormGroup({
    login: new FormControl('', { validators: [Validators.required, Validators.minLength(3)], nonNullable: true }),
    email: new FormControl('', { validators : [Validators.required, Validators.email], nonNullable: true }),
    nom: new FormControl('', {nonNullable: true}),
    prenom: new FormControl('', {nonNullable: true}),
    password: new FormControl('', { validators: [Validators.required, Validators.minLength(6)], nonNullable: true}),
    role: new FormControl<UserRole>('user', {validators: [Validators.required], nonNullable: true})
  });

  constructor() {
    // Charger les rôles disponibles
    this.usersService.getAvailableRoles().subscribe({
      next: (data) => {
        this.availableRoles = data.roles;
        this.roleDescriptions = data.descriptions;
      },
      error: (err) => {
        console.error('Erreur chargement rôles:', err);
      }
    });
  }

  getRoleIcon(role: UserRole): string {
    return User.getRoleIcon(role);
  }

  getRoleDescription(role?: UserRole): string {
    return this.roleDescriptions[role as UserRole] || '';
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }
    const userData = this.form.value;
    this.dialogRef.close(userData);
  }



}
