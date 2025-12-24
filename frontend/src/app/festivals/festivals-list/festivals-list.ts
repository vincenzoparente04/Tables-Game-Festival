import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FestivalCard } from '../festival-card/festival-card';
import { FestivalsForm } from '../festivals-form/festivals-form';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FestivalsDto } from '../../types/festivals-dto';
import { FestivalsService } from '../../shared/festivals-service';
import { PermissionsService } from '../../services/permissions-service'
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
  private readonly snackBar = inject(MatSnackBar);
  private readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);

  readonly festivals = signal<FestivalsDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
 
  readonly canCreate = this.permissions.can('festivals', 'create');
  readonly canModify = this.permissions.can('festivals', 'update');
  readonly canDelete = this.permissions.can('festivals', 'delete');
  readonly canViewStocks = this.permissions.can('festivals', 'viewStocks');
  readonly canSetCourant = this.permissions.can('festivals', 'setCourant');
  readonly canViewAll = this.permissions.can('festivals','viewAll');
  readonly canViewCurrent = this.permissions.can('festivals','viewCurrent');

  readonly canViewZonesTarifaires = this.permissions.can('zonesTarifaires', 'view');
  readonly canManageZones = this.permissions.can('zonesTarifaires', 'create');
  
  readonly canViewZonesPlan = this.permissions.can('zonesPlan', 'view');

  constructor() {
    if(this.canViewAll()){
      this.loadFestivals();
    }
    else if (this.canViewCurrent()) {
      this.loadCurrentFestival();
    }
    
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

  loadCurrentFestival() {
    this.loading.set(true);
    this.error.set(null);
    this.festivalsService.getCurrent().subscribe({
      next: (festival: FestivalsDto) => {
        this.festivals.set([festival]);
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
    if (!this.canSetCourant()) {
      this.snackBar.open('Vous n\'avez pas la permission de définir le festival courant', 'Fermer', { duration: 3000 });
      return;
    }

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
    if (!this.canCreate()) {
      this.snackBar.open('Vous n\'avez pas la permission de créer un festival', 'Fermer', { duration: 3000 });
      return;
    }

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
    if (!this.canModify()) {
      this.snackBar.open('Vous n\'avez pas la permission de modifier un festival', 'Fermer', { duration: 3000 });
      return;
    }

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
    if (!this.canDelete()) {
      this.snackBar.open('Vous n\'avez pas la permission de supprimer un festival', 'Fermer', { duration: 3000 });
      return;
    }

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

  onZonesChanged() {
    if (this.canViewAll()) {
      this.loadFestivals();
    } else if (this.canViewCurrent()) {
      this.loadCurrentFestival();
    }
  }


}
