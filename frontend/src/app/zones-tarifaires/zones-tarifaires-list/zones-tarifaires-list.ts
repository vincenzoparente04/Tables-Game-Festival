import { Component, input, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ZoneTarifaireDto } from '../../types/zone-tarifaire-dto';
import { ZonesTarifService } from '../zones-tarif-service';
import { ZoneFormDialog } from '../zone-form-dialog/zone-form-dialog';

@Component({
  selector: 'app-zones-tarifaires-list',
  standalone: true,
  imports: [CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule],
  templateUrl: './zones-tarifaires-list.html',
  styleUrl: './zones-tarifaires-list.css',
})

export class ZonesTarifairesList {
  private zonesTarifairesService = inject(ZonesTarifService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  festivalId = input.required<number>();
  canManage = input<boolean>(false);

  zonesChanged = output<void>();

  zones = signal<ZoneTarifaireDto[]>([]);
  loading = signal(false);

  constructor() {
    effect(() => {
      const festId = this.festivalId();
      if (festId) {
        this.loadZones();
      }
    });
  }

  private loadZones() {
    this.loading.set(true);
    this.zonesTarifairesService.getByFestival(this.festivalId()).subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement zones:', err);
        this.zones.set([]);
        this.loading.set(false);
      }
    });
  }

  createZone() {
    const dialogRef = this.dialog.open(ZoneFormDialog, {
      width: '500px',
      disableClose: true,
      data: { festivalId: this.festivalId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'create') {
        this.zonesTarifairesService.create(this.festivalId(), result.data).subscribe({
          next: () => {
            this.snackBar.open('Zone tarifaire créée', 'OK', { duration: 2000 });
            this.loadZones();
            this.zonesChanged.emit();
          },
          error: (err) => {
            console.error(err);
            const errorMsg = err.error?.error || 'Erreur lors de la création';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  editZone(zone: ZoneTarifaireDto) {
    const dialogRef = this.dialog.open(ZoneFormDialog, {
      width: '500px',
      disableClose: true,
      data: { festivalId: this.festivalId(), zone }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit') {
        this.zonesTarifairesService.update(result.zoneId, result.data).subscribe({
          next: () => {
            this.snackBar.open('Zone tarifaire modifiée', 'OK', { duration: 2000 });
            this.loadZones();
            this.zonesChanged.emit();
          },
          error: (err) => {
            console.error(err);
            const errorMsg = err.error?.error || 'Erreur lors de la modification';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteZone(zoneId: number, zoneName: string) {
    if (confirm(`⚠️ Supprimer la zone "${zoneName}" ?\n\nCette action est irréversible et impossible si des réservations existent.`)) {
      this.zonesTarifairesService.delete(zoneId).subscribe({
        next: () => {
          this.snackBar.open('Zone tarifaire supprimée', 'OK', { duration: 2000 });
          this.loadZones();
          this.zonesChanged.emit();
        },
        error: (err) => {
          console.error(err);
          const errorMsg = err.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

}
