import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservationSummary } from '../../types/reservation-dto';
import { ReservationsService } from '../../services/reservations-service';

@Component({
  selector: 'app-reservation-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './reservation-card.html',
  styleUrl: './reservation-card.css',
})
export class ReservationCard {
  reservation = input.required<ReservationSummary>();
  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);

  edit = output<ReservationSummary>();
  delete = output<number>();

  onEdit() {
    this.edit.emit(this.reservation());
  }

  onDelete() {
    this.delete.emit(this.reservation().id);
  }

  getTypeLabel(): string {
    return this.reservation().type_reservant || 'Non défini';
  }

  getTypeIcon(): string {
    const icons: Record<string, string> = {
      'editeur': 'business',
      'prestataire': 'engineering',
      'association': 'groups',
      'animation': 'celebration',
      'boutique': 'storefront',
      'autre': 'category'
    };
    return icons[this.reservation().type_reservant || ''] || 'help';
  }

  getTypeColor(): string {
    const colors: Record<string, string> = {
      'editeur': '#1976d2',
      'prestataire': '#7b1fa2',
      'association': '#388e3c',
      'animation': '#f57c00',
      'boutique': '#c2185b',
      'autre': '#616161'
    };
    return colors[this.reservation().type_reservant || ''] || '#616161';
  }

  getEtatContactLabel(): string {
    return ReservationsService.getEtatContactLabel(this.reservation().etat_contact);
  }

  getEtatContactColor(): string {
    return ReservationsService.getEtatContactColor(this.reservation().etat_contact);
  }

  getEtatPresenceLabel(): string {
    return ReservationsService.getEtatPresenceLabel(this.reservation().etat_presence);
  }

  getEtatPresenceColor(): string {
    return ReservationsService.getEtatPresenceColor(this.reservation().etat_presence);
  }

}
