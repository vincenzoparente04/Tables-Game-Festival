import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FestivalCard } from '../festival-card/festival-card';
import { FestivalsForm } from '../festivals-form/festivals-form';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FestivalsDto } from '../../types/festivals-dto';
import { FestivalsService } from '../../shared/festivals-service';
import { AuthService } from '../../shared/auth/auth-service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-festivals-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FestivalsForm, FestivalCard, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDialogModule],
  templateUrl: './festivals-list.html',
  styleUrl: './festivals-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FestivalsList {
  private readonly festivalsService = inject(FestivalsService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly festivals = signal<FestivalsDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // it will be updated with computed whenever the current user changes
  readonly isAdminOrSuperOrga = computed(() => {
    const user = this.authService.currentUser();
    const role = user?.role ?? '';
    return role === 'admin' || role === 'super organisateur';
  });
  readonly canCreate = computed(() => this.isAdminOrSuperOrga());
  readonly canModify = computed(() => this.isAdminOrSuperOrga());
  readonly canDelete = computed(() => this.isAdminOrSuperOrga());

  constructor() {
    this.loadFestivals();
  }

  loadFestivals() {
    this.loading.set(true);
    this.error.set(null);
    this.festivalsService.getAllFestivals().subscribe({
      next: (festivals: FestivalsDto[]) => {
        this.festivals.set(festivals ?? []);
        this.loading.set(false);
      },
      error: (err : any) => {
        console.error(err);
        this.error.set('Erreur lors du chargement des festivals');
        this.festivals.set([]);
        this.snackBar.open('Erreur lors du chargement des festivals', 'Fermer', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  trackById(_: number, item: FestivalsDto) {
    return item.id;
  }

  onSetCourant(id: number) {
    this.festivalsService.setCourant(id).subscribe({
      next: () => {
        this.snackBar.open('Festival défini comme courant', 'OK', { duration: 2000 });
        this.loadFestivals();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erreur lors de la définition du festival courant', 'Fermer', { duration: 3000 });
      }
    });
  }

  // Ouvre le formulaire festival dans une modale (création ou édition)
  createFestival() {
    const dialogRef = this.dialog.open(FestivalsForm, {
      width: '500px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.loadFestivals();
      }
    });
  }

  onEdit(festival: FestivalsDto) {
    const dialogRef = this.dialog.open(FestivalsForm, {
      width: '500px',
      disableClose: true,
      data: { festival }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.loadFestivals();
      }
    });
  }

  onDelete(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce festival ? Cette action est irréversible.')) {
      this.festivalsService.deleteFestival(id).subscribe({
        next: () => {
          this.snackBar.open('Festival supprimé', 'OK', { duration: 2000 });
          this.loadFestivals();
        },
        error: (err : any) => {
          console.error(err);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
          console.error(err as Error);
        }
      });
    }
  }


}
