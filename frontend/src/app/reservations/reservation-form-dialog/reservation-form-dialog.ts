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

interface DialogData {
  festivalId: number;
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

  reservants = signal<ReservantSummary[]>([]);
  zonesTarifaires = signal<ZoneTarifaireDto[]>([]);
  prixPrise = signal(0);

  form = new FormGroup({
    reservant_id: new FormControl<number | null>(null, Validators.required),
    nb_prises_electriques: new FormControl(0, [Validators.min(0)]),
    viendra_animer: new FormControl(true),
    notes: new FormControl(''),
    zones_reservees: new FormArray([])
  });

  constructor() {
    this.loadReservants();
    this.loadZonesTarifaires();
    this.addZone(); // Au moins une zone au départ
  }

  get zonesReservees(): FormArray {
    return this.form.get('zones_reservees') as FormArray;
  }

  private loadReservants() {
    this.reservantsService.getReservants().subscribe({
      next: (reservants) => this.reservants.set(reservants),
      error: (err) => console.error('Erreur réservants:', err)
    });
  }

  private loadZonesTarifaires() {
    this.zonesTarifService.getByFestival(this.data.festivalId).subscribe({
      next: (zones) => this.zonesTarifaires.set(zones),
      error: (err) => console.error('Erreur zones:', err)
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

  onSubmit() {
    if (this.form.invalid) return;

    const payload = {
      reservant_id: this.form.value.reservant_id!,
      nb_prises_electriques: this.form.value.nb_prises_electriques || 0,
      viendra_animer: this.form.value.viendra_animer || false,
      notes: this.form.value.notes || '',
      zones_reservees: this.zonesReservees.value.filter((z: any) => z.zone_tarifaire_id && z.nombre_tables)
    };

    this.dialogRef.close(payload);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
