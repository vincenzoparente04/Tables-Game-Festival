import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { ReservantSummary, ReservantDetail } from '../../types/reservant-dto';
import { ReservantService } from '../../services/reservant-service';
import { EditeursService, EditeurSummary } from '../../services/editeurs-service';
import { PermissionsService } from '../../services/permissions-service';
import { ReservantCard } from '../reservant-card/reservant-card';
import { ReservantForm } from '../reservant-form/reservant-form';

@Component({
  selector: 'app-reservants-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    ReservantCard,
    ReservantForm
  ],
  templateUrl: './reservants-list.html',
  styleUrl: './reservants-list.css',
})
export class ReservantsList {
  private reservantsService = inject(ReservantService);
  private editeursService = inject(EditeursService);
  private permissions = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);

  readonly canCreate = this.permissions.can('reservants', 'create');
  readonly canModify = this.permissions.can('reservants', 'update');
  readonly canDelete = this.permissions.can('reservants', 'delete');

  reservants = signal<ReservantSummary[]>([]);
  editeurs = signal<EditeurSummary[]>([]);
  selectedReservant = signal<ReservantSummary | null>(null);
  reservantDetail = signal<ReservantDetail | null>(null);
  reservantToEdit = signal<ReservantDetail | null>(null);
  loading = signal(false);
  loadingDetail = signal(false);
  showForm = signal(false);

  typeStats = computed(() => {
    const stats = new Map<string, number>();
    this.reservants().forEach(r => {
      stats.set(r.type_reservant, (stats.get(r.type_reservant) || 0) + 1);
    });

    return Array.from(stats.entries()).map(([type, count]) => ({
      type,
      count,
      label: ReservantService.getTypeLabel(type as any),
      icon: ReservantService.getTypeIcon(type as any),
      color: ReservantService.getTypeColor(type as any)
    }));
  });

  constructor() {
    this.loadReservants();
    this.loadEditeurs();
  }

  private loadReservants() {
    this.loading.set(true);
    this.reservantsService.getReservants().subscribe({
      next: (data) => {
        this.reservants.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.reservants.set([]);
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadEditeurs() {
    this.editeursService.getEditeurs().subscribe({
      next: (data) => this.editeurs.set(data),
      error: (err) => console.error(err)
    });
  }

  startCreate() {
    this.reservantToEdit.set(null);
    this.selectedReservant.set(null);
    this.showForm.set(true);
  }

  selectReservant(reservant: ReservantSummary) {
    this.selectedReservant.set(reservant);
    this.showForm.set(false);
    this.loadDetail(reservant.id);
  }

  private loadDetail(id: number) {
    this.loadingDetail.set(true);
    this.reservantsService.getReservantById(id).subscribe({
      next: (detail) => {
        this.reservantDetail.set(detail);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loadingDetail.set(false);
        this.snackBar.open('Erreur lors du chargement des détails', 'Fermer', { duration: 3000 });
      }
    });
  }

  editReservant(reservant: ReservantSummary) {
    this.loadingDetail.set(true);
    this.reservantsService.getReservantById(reservant.id).subscribe({
      next: (detail) => {
        this.reservantToEdit.set(detail);
        this.selectedReservant.set(null);
        this.showForm.set(true);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loadingDetail.set(false);
        this.snackBar.open('Erreur', 'Fermer', { duration: 3000 });
      }
    });
  }

  deleteReservant(reservant: ReservantSummary) {
    if (confirm(`⚠️ Supprimer "${reservant.nom}" ?\n\nCette action est irréversible si le réservant a des réservations.`)) {
      this.reservantsService.deleteReservant(reservant.id).subscribe({
        next: () => {
          this.snackBar.open('Réservant supprimé', 'OK', { duration: 2000 });
          this.selectedReservant.set(null);
          this.reservantDetail.set(null);
          const current = this.reservants();
          this.reservants.set(current.filter(r => r.id !== reservant.id));
        },
        error: (err) => {
          const errorMsg = err?.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  onCreated() {
    this.showForm.set(false);
    this.loadReservants();
  }

  onUpdated() {
    this.reservantToEdit.set(null);
    this.showForm.set(false);
    this.loadReservants();
  }

  onFormCancelled() {
    this.reservantToEdit.set(null);
    this.showForm.set(false);
  }

  getDetailTypeLabel(): string {
    return this.reservantDetail() 
      ? ReservantService.getTypeLabel(this.reservantDetail()!.type_reservant)
      : '';
  }

  getDetailTypeIcon(): string {
    return this.reservantDetail()
      ? ReservantService.getTypeIcon(this.reservantDetail()!.type_reservant)
      : 'help';
  }

  getDetailTypeColor(): string {
    return this.reservantDetail()
      ? ReservantService.getTypeColor(this.reservantDetail()!.type_reservant)
      : '#616161';
  }

}
