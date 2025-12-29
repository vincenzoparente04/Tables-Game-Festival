import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JeuSummary } from '../../services/jeux-service';

@Component({
  selector: 'app-jeux-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jeux-card.html',
  styleUrl: './jeux-card.css',
})
export class JeuxCard {
  @Input() jeu!: JeuSummary;
  @Input() isSelected = false;
  @Input() isEditing = false;
  @Output() onSelect = new EventEmitter<JeuSummary>();
  @Output() onEdit = new EventEmitter<JeuSummary>();
  @Output() onDelete = new EventEmitter<JeuSummary>();

  selectJeu(): void {
    this.onSelect.emit(this.jeu);
  }

  editJeu(): void {
    this.onEdit.emit(this.jeu);
  }

  deleteJeu(): void {
    this.onDelete.emit(this.jeu);
  }
}
