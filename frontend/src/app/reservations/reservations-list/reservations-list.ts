import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ReservationSummary } from '../../types/reservation-dto';
import { ReservationsService } from '../../services/reservations-service';
import { PermissionsService } from '../../services/permissions-service';
import { ReservationCard } from '../reservation-card/reservation-card';
import { ReservationFormDialog } from '../reservation-form-dialog/reservation-form-dialog';
import { FestivalsService } from '../../shared/festivals-service';
import { FestivalsDto } from '../../types/festivals-dto';

@Component({
  selector: 'app-reservations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule,
    ReservationCard,
  ],
  templateUrl: './reservations-list.html',
  styleUrl: './reservations-list.css',
})
export class ReservationsList {
  private route = inject(ActivatedRoute);
  private reservationsService = inject(ReservationsService);
  private festivalsService = inject(FestivalsService);
  private permissions = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  festivalId = signal<number>(0);
  festival = signal<FestivalsDto | null>(null);
  reservations = signal<ReservationSummary[]>([]);
  loading = signal(false);

  readonly canCreate = this.permissions.can('reservations', 'create');
  readonly canView = this.permissions.can('reservations', 'view');
  readonly canModify = this.permissions.can('reservations', 'update');
  readonly canDelete = this.permissions.can('reservations', 'delete');

  // Statistiques
  totalReservations = computed(() => this.reservations().length);
  reservationsConfirmees = computed(() => 
    this.reservations().filter(r => r.etat_contact === 'reserve').length
  );
  montantTotal = computed(() => 
    this.reservations().reduce((sum, r) => sum + (parseFloat(String(r.montant_brut || 0))), 0)
  );
  tablesReservees = computed(() => 
    this.reservations().reduce((sum, r) => sum + (parseInt(String(r.nb_tables_reservees || 0), 10)), 0)
  );

  // Réservations par état de contact
  parEtatContact = computed(() => {
    const grouped = new Map<string, ReservationSummary[]>();
    this.reservations().forEach(r => {
      const etat = r.etat_contact;
      if (!grouped.has(etat)) {
        grouped.set(etat, []);
      }
      grouped.get(etat)!.push(r);
    });
    return grouped;
  });

  constructor() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.festivalId.set(id);
        this.loadData();
      }
    });
  }

  private loadData() {
    this.loading.set(true);

    // Charger le festival
    this.festivalsService.getFestivalById(this.festivalId()).subscribe({
      next: (fest) => this.festival.set(fest),
      error: (err) => console.error('Erreur festival:', err)
    });

    // Charger les réservations
    this.loadReservations();
  }

  private loadReservations() {
    this.reservationsService.getByFestival(this.festivalId()).subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur réservations:', err);
        this.reservations.set([]);
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
      }
    });
  }

  createReservation() {
    const dialogRef = this.dialog.open(ReservationFormDialog, {
      width: '1000px',
      maxHeight: '90vh',
      disableClose: true,
      data: { festivalId: this.festivalId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reservationsService.create(this.festivalId(), result).subscribe({
          next: () => {
            this.snackBar.open('Réservation créée', 'OK', { duration: 2000 });
            this.loadReservations();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de la création';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  onEdit(reservation: ReservationSummary) {
    if (!this.canModify()) {
      this.snackBar.open('Pas de permission', 'Fermer', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ReservationFormDialog, {
      width: '1000px',
      maxHeight: '90vh',
      disableClose: true,
      data: {
        reservation,               
        festivalId: this.festivalId()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.reservationsService
        .update(reservation.id, result)
        .subscribe({
          next: () => {
            this.snackBar.open('Réservation modifiée', 'OK', { duration: 2000 });
            this.loadReservations();
          },
          error: () => {
            this.snackBar.open('Erreur modification', 'Fermer', { duration: 3000 });
          }
        });
    });
  } 

  onDelete(reservationId: number, reservantNom: string) {
    if (confirm(`⚠️ Supprimer la réservation de "${reservantNom}" ?\n\nCette action est irréversible.`)) {
      this.reservationsService.delete(reservationId).subscribe({
        next: () => {
          this.snackBar.open('Réservation supprimée', 'OK', { duration: 2000 });
          this.loadReservations();
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  getEtatContactLabel(etat: string): string {
    return ReservationsService.getEtatContactLabel(etat as any);
  }

  getReservationsByEtat(etat: string): ReservationSummary[] {
    return this.parEtatContact().get(etat) || [];
  }

  getEtatsWithReservations(): string[] {
    return Array.from(this.parEtatContact().keys());
  }

  getEtatContactColor(etat: string): string {
    return ReservationsService.getEtatContactColor(etat as any);
  }
}
