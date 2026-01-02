import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReservantService } from '../../services/reservant-service';
import { ZonesTarifService } from '../../zones-tarifaires/zones-tarif-service';
import { ReservantSummary } from '../../types/reservant-dto';
import { ZoneTarifaireDto } from '../../types/zone-tarifaire-dto';
import { ReservationsService } from '../../services/reservations-service';

interface DialogData {
  festivalId: number;
  reservation?: any;
}

@Component({
  selector: 'app-reservation-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './reservation-form-dialog.html',
  styleUrl: './reservation-form-dialog.css',
})
export class ReservationFormDialog {
  private dialogRef = inject(MatDialogRef<ReservationFormDialog>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);
  private reservantsService = inject(ReservantService);
  private zonesTarifService = inject(ZonesTarifService);
  private reservationsService = inject(ReservationsService);

  reservants = signal<ReservantSummary[]>([]);
  zonesTarifaires = signal<ZoneTarifaireDto[]>([]);
  prixPrise = signal(0);

  reservationId = signal<number | null>(null);
  submitLabel = signal('Créer');

  form = new FormGroup({
    reservant_id: new FormControl<number | null>(null, Validators.required),
    nb_prises_electriques: new FormControl(0, [Validators.min(0)]),
    viendra_animer: new FormControl(true),
    notes: new FormControl(''),
    zones_reservees: new FormArray([])
  });

  constructor() {
    this.loadReservants();

    const festivalId = this.getFestivalId();
    if (festivalId) {
      this.loadZonesTarifaires(festivalId);
    }

    if (this.data.reservation) {
      this.reservationId.set(this.data.reservation.id);
      this.submitLabel.set('Modifier');
      this.patchForm(this.data.reservation);
    } else {
      this.addZone(); // création → au moins une zone
    }
  }

  private getFestivalId(): number | null {
    return (
      this.data.reservation?.festival_id ??
      this.data.festivalId ??
      null
    );
  }

  get zonesReservees(): FormArray {
    return this.form.get('zones_reservees') as FormArray;
  }

  private loadReservants() {
    const festivalId = this.getFestivalId();
    this.reservantsService.getReservants().subscribe({
      next: (allReservants) => {
        // Si on est en mode édition, on garde le réservant actuel
        const currentReservantId = this.data.reservation?.reservant_id;
        // Filtrer les réservants : on garde ceux qui n'ont pas encore de réservation pour ce festival
        if (festivalId) {
          this.reservationsService.getByFestival(festivalId).subscribe({
            next: (reservations) => {
              const reservantIdsWithReservation = new Set(
                reservations.map(r => r.reservant_id)
              );

              // Filtrer : garder ceux qui n'ont pas de réservation OU le réservant actuel (édition)
              const available = allReservants.filter(reservant => 
                !reservantIdsWithReservation.has(reservant.id) || 
                reservant.id === currentReservantId
              );
              
              this.reservants.set(available);
            },
            error: (err) => {
              console.error('Erreur chargement réservations:', err);
              this.reservants.set(allReservants); 
            }
          });
        } else {
          this.reservants.set(allReservants);
        }
      },
      error: (err) => console.error('Erreur réservants:', err)
    });
  }

  private loadZonesTarifaires(festivalId: number) {
    this.zonesTarifService.getByFestival(festivalId).subscribe({
      next: (zones) => this.zonesTarifaires.set(zones),
      error: (e) => console.error('Erreur zones tarifaires:', e)
    });
  }

  addZone() {
    this.zonesReservees.push(new FormGroup({
      zone_tarifaire_id: new FormControl<number | null>(null, Validators.required),
      nombre_tables: new FormControl(1, [Validators.required, Validators.min(1)])
    }));
  }

  removeZone(index: number) {
    if (this.zonesReservees.length > 1) {
      this.zonesReservees.removeAt(index);
    }
  }

  private patchForm(reservation: any) {
    this.form.patchValue({
      reservant_id: reservation.reservant_id,
      nb_prises_electriques: reservation.nb_prises_electriques,
      viendra_animer: reservation.viendra_animer,
      notes: reservation.notes
    });

    this.zonesReservees.clear();

    if (reservation.zones_reservees && reservation.zones_reservees.length > 0) {
      reservation.zones_reservees.forEach((z: any) => {
        this.zonesReservees.push(
          new FormGroup({
            zone_tarifaire_id: new FormControl(z.zone_tarifaire_id, Validators.required),
            nombre_tables: new FormControl(z.nombre_tables, [ Validators.required, Validators.min(1)])
          })
        );
      });
    } else {
      this.addZone();
    }
  }

  calculateTotal(): number {
    let total = 0;

    // Tables
    const zones = this.zonesReservees.value;
    zones.forEach((z: any) => {
      if (z.zone_tarifaire_id && z.nombre_tables) {
        const zt = this.zonesTarifaires().find(zone => zone.id === z.zone_tarifaire_id);
        if (zt) {
          total += zt.prix_table * z.nombre_tables;
        }
      }
    });

    // Prises
    const prises = this.form.value.nb_prises_electriques || 0;
    total += prises * this.prixPrise();

    return total;
  }

  // Vérifier si une zone est déjà sélectionnée
  isZoneSelected(zoneId: number, currentIndex: number): boolean {
    return this.zonesReservees.controls.some((control, index) => {
      if (index === currentIndex) return false;
      return control.get('zone_tarifaire_id')?.value === zoneId;
    });
  }

  // Obtenir les zones disponibles pour un index donné
  getAvailableZones(currentIndex: number): ZoneTarifaireDto[] {
    return this.zonesTarifaires().filter(zone => {
      return !this.isZoneSelected(zone.id, currentIndex) || 
             this.zonesReservees.at(currentIndex).get('zone_tarifaire_id')?.value === zone.id;
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    const payload = {
      ...this.form.value,
      zones_reservees: this.zonesReservees.value
    };

    this.dialogRef.close(payload);
  }


  onCancel() {
    this.dialogRef.close();
  }
}
