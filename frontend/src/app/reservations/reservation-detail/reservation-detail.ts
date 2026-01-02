import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { ReservationDetails, ContactReservation } from '../../types/reservation-dto';
import { ReservationsService } from '../../services/reservations-service';
import { PermissionsService } from '../../services/permissions-service';
import { AddJeuDialog } from '../add-jeu-dialog/add-jeu-dialog';
import { AddContactDialog } from '../add-contact-dialog/add-contact-dialog';
import { EditReservationDialog } from '../edit-reservation-dialog/edit-reservation-dialog';

@Component({
  selector: 'app-reservation-detail',
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
    MatTableModule,
    MatDividerModule,
    MatListModule
  ],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reservationsService = inject(ReservationsService);
  private permissions = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  reservationId = signal<number>(0);
  reservation = signal<ReservationDetails | null>(null);
  loading = signal(false);

  readonly canModify = this.permissions.can('reservations', 'update');
  readonly canDelete = this.permissions.can('reservations', 'delete');
  readonly canUpdateWorkflow = this.permissions.can('reservations', 'updateWorkflow');

  // Calculs
  montantTotal = computed(() => {
    const res = this.reservation();
    if (!res) return 0;
    return (res.montant_brut || 0) - (res.remise_montant || 0);
  });

  constructor() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.reservationId.set(id);
        this.loadReservation();
      }
    });
  }

  private loadReservation() {
    this.loading.set(true);
    this.reservationsService.getById(this.reservationId()).subscribe({
      next: (detail) => {
        this.reservation.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement réservation:', err);
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
      }
    });
  }

  // Actions principales
  editReservation() {
    const dialogRef = this.dialog.open(EditReservationDialog, {
      width: '600px',
      data: { reservation: this.reservation() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reservationsService.update(this.reservationId(), result).subscribe({
          next: () => {
            this.snackBar.open('Réservation mise à jour', 'OK', { duration: 2000 });
            this.loadReservation();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteReservation() {
    const res = this.reservation();
    if (!res) return;

    if (confirm(`⚠️ Supprimer la réservation de "${res.reservant_nom}" ?\n\nCette action est irréversible.`)) {
      this.reservationsService.delete(this.reservationId()).subscribe({
        next: () => {
          this.snackBar.open('Réservation supprimée', 'OK', { duration: 2000 });
          this.router.navigate(['/festivals', res.festival_id, 'reservations']);
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // Workflow
  updateEtatContact(nouvelEtat: string) {
    this.reservationsService.updateEtatContact(this.reservationId(), nouvelEtat as any).subscribe({
      next: () => {
        this.snackBar.open('État de contact mis à jour', 'OK', { duration: 2000 });
        this.loadReservation();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  updateEtatPresence(nouvelEtat: string) {
    this.reservationsService.updateEtatPresence(this.reservationId(), nouvelEtat as any).subscribe({
      next: () => {
        this.snackBar.open('État de présence mis à jour', 'OK', { duration: 2000 });
        this.loadReservation();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  addContact() {
    const dialogRef = this.dialog.open(AddContactDialog, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((contact: Partial<ContactReservation>) => {
      if (contact) {
        this.reservationsService.addContact(this.reservationId(), contact).subscribe({
          next: () => {
            this.snackBar.open('Contact ajouté', 'OK', { duration: 2000 });
            this.loadReservation();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de l\'ajout';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  // Jeux
  addJeu() {
    const res = this.reservation();
    if (!res) return;

    const dialogRef = this.dialog.open(AddJeuDialog, {
      width: '600px',
      data: { 
        festivalId: res.festival_id,
        tablesRestantes: this.getTablesRestantes()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reservationsService.addJeu(this.reservationId(), result).subscribe({
          next: () => {
            this.snackBar.open('Jeu ajouté', 'OK', { duration: 2000 });
            this.loadReservation();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de l\'ajout';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  removeJeu(jeuFestivalId: number, jeuNom: string) {
    if (confirm(`Retirer "${jeuNom}" de la réservation ?`)) {
      this.reservationsService.removeJeu(this.reservationId(), jeuFestivalId).subscribe({
        next: () => {
          this.snackBar.open('Jeu retiré', 'OK', { duration: 2000 });
          this.loadReservation();
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  toggleJeuRecu(jeuFestivalId: number, currentState: boolean) {
    this.reservationsService.marquerJeuRecu(this.reservationId(), jeuFestivalId, !currentState).subscribe({
      next: () => {
        this.snackBar.open(!currentState ? 'Jeu marqué comme reçu' : 'Jeu marqué comme non reçu', 'OK', { duration: 2000 });
        this.loadReservation();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  // Facturation
  genererFacture() {
    this.reservationsService.genererFacture(this.reservationId()).subscribe({
      next: () => {
        this.snackBar.open('Facture générée', 'OK', { duration: 2000 });
        this.loadReservation();
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la génération';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  // Helpers
  getTablesRestantes(): number {
    const res = this.reservation();
    if (!res) return 0;
    const reservees = parseInt(String(res.nb_tables_reservees || 0), 10);
    const utilisees = res.jeux.reduce((sum, j) => sum + (parseFloat(String(j.tables_allouees || 0))), 0);
    return Math.max(0, reservees - utilisees);
  }

  getEtatContactLabel(etat: string): string {
    return ReservationsService.getEtatContactLabel(etat as any);
  }

  getEtatContactColor(etat: string): string {
    return ReservationsService.getEtatContactColor(etat as any);
  }

  getEtatPresenceLabel(etat: string): string {
    return ReservationsService.getEtatPresenceLabel(etat as any);
  }

  getEtatPresenceColor(etat: string): string {
    return ReservationsService.getEtatPresenceColor(etat as any);
  }

  // Liste des états disponibles
  etatsContact = [
    { value: 'pas_contacte', label: 'Pas contacté' },
    { value: 'contacte', label: 'Contacté' },
    { value: 'en_discussion', label: 'En discussion' },
    { value: 'reserve', label: 'Réservé' },
    { value: 'liste_jeux_demandee', label: 'Liste jeux demandée' },
    { value: 'liste_jeux_obtenue', label: 'Liste jeux obtenue' },
    { value: 'jeux_recus', label: 'Jeux reçus' }
  ];

  etatsPresence = [
    { value: 'non_defini', label: 'Non défini' },
    { value: 'present', label: 'Présent' },
    { value: 'considere_absent', label: 'Considéré absent' },
    { value: 'absent', label: 'Absent' }
  ];

}
