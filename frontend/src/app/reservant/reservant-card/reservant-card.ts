import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservantSummary } from '../../types/reservant-dto';
import { ReservantService } from '../../services/reservant-service';

@Component({
  selector: 'app-reservant-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './reservant-card.html',
  styleUrl: './reservant-card.css',
})
export class ReservantCard {
  reservant = input.required<ReservantSummary>();
  selected = input(false);
  canModify = input(false);
  canDelete = input(false);

  select = output<ReservantSummary>();
  edit = output<ReservantSummary>();
  delete = output<ReservantSummary>();

  getTypeLabel(): string {
    return ReservantService.getTypeLabel(this.reservant().type_reservant);
  }

  getTypeIcon(): string {
    return ReservantService.getTypeIcon(this.reservant().type_reservant);
  }

  getTypeColor(): string {
    return ReservantService.getTypeColor(this.reservant().type_reservant);
  }

  onSelect() {
    this.select.emit(this.reservant());
  }

  onEdit() {
    this.edit.emit(this.reservant());
  }

  onDelete() {
    this.delete.emit(this.reservant());
  }

}
