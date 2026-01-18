import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { User } from '../../users/user';
import { UserDto, UserRole } from '../../types/user-dto';
import { CreateUserDialog } from '../create-user-dialog/create-user-dialog';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDialogModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  private userService = inject(User);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  
  allUsers = signal<UserDto[]>([]);
  pendingUsers = signal<UserDto[]>([]);
  availableRoles = signal<UserRole[]>([]);
  roleDescriptions = signal<Record<UserRole, string>>({} as any);
  loading = signal(false);

  displayedColumns = ['login', 'nom', 'prenom', 'email', 'role', 'created_at', 'actions'];
  pendingColumns = ['login', 'nom', 'prenom', 'email', 'created_at', 'actions'];

  constructor() {
    this.loadData();
  }

  private loadAllUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => this.allUsers.set(users),
      error: (err) => console.error('Erreur:', err)
    });
  }

  private loadPendingUsers() {
    this.userService.getPendingUsers().subscribe({
      next: (users) => this.pendingUsers.set(users),
      error: (err) => console.error('Erreur:', err)
    });
  }

  loadData() {
    this.loading.set(true);
    
    // Tous les utilisateurs
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });

    // Comptes en attente
    this.userService.getPendingUsers().subscribe({
      next: (users) => this.pendingUsers.set(users),
      error: (err) => console.error('Erreur:', err)
    });

    // Rôles disponibles
    this.userService.getAvailableRoles().subscribe({
      next: (data) => {
        this.availableRoles.set(data.roles);
        this.roleDescriptions.set(data.descriptions);
      },
      error: (err) => console.error('Erreur:', err)
    });
  }

  // Changer le rôle
  changeRole(user: UserDto, newRole: UserRole) {
    if (user.role === newRole) return;

    if (confirm(`Changer le rôle de ${user.login} en "${newRole}" ?`)) {
      this.userService.changeUserRole(user.id, newRole).subscribe({
        next: () => {
          this.snackBar.open('Rôle mis à jour', 'OK', { duration: 2000 });
          // Recharger juste la liste des utilisateurs
          this.loadAllUsers();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // Valider un compte en attente
  validateUser(user: UserDto, role: UserRole) {
    if (!role || role === 'user') {
      this.snackBar.open('Sélectionnez un rôle valide', 'OK', { duration: 2000 });
      return;
    }

    this.userService.validateUser(user.id, role).subscribe({
      next: () => {
        this.snackBar.open(`Compte de ${user.login} validé`, 'OK', { duration: 2000 });
        // Recharger les deux listes
        this.loadPendingUsers();
        this.loadAllUsers();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  // Supprimer
  deleteUser(user: UserDto) {
    if (confirm(`⚠️ Supprimer "${user.login}" ?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackBar.open('Utilisateur supprimé', 'OK', { duration: 2000 });
          // Recharger les deux listes
          this.loadAllUsers();
          this.loadPendingUsers();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // Ouvrir dialog de creation
  openCreateUserDialog() {
    const dialogRef = this.dialog.open(CreateUserDialog, {
      width: '600px',
      disableClose: true,
      data: { 
        availableRoles: this.availableRoles(),
        roleDescriptions: this.roleDescriptions()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createUser(result);
      }
    });
  }

  // Créer utilisateur
  createUser(userData: any) {
    this.userService.createUser(userData).subscribe({
      next: () => {
        this.snackBar.open(`Utilisateur ${userData.login} créé`, 'OK', { duration: 3000 });
        // Recharger les deux listes pour voir le nouvel utilisateur
        this.loadAllUsers();
        this.loadPendingUsers();
      },
      error: (err) => {
        console.error(err);
        const errorMsg = err.error?.error || 'Erreur lors de la création';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 4000 });
      }
    });
  }

  //helpers
  getRoleColor(role: UserRole) {
    return User.getRoleColor(role);
  }

  getRoleIcon(role: UserRole) {
    return User.getRoleIcon(role);
  }

  getAvailableRolesForSelect(): UserRole[] {
    return this.availableRoles().filter(r => r !== 'user');
  }

  getRoleDescription(role: UserRole): string {
    return this.roleDescriptions()[role] || '';
  }

  getPendingCount(): number {
    return this.pendingUsers().length;
  }

  getActiveCount(): number {
    return this.allUsers().filter(u => u.role !== 'user').length;
  }
}