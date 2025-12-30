import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JeuSummary } from '../../services/jeux-service';

@Component({
  selector: 'app-jeux-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jeux-card.html',
  styleUrl: './jeux-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JeuxCard {
  jeu = input.required<JeuSummary>();
  isSelected = input(false);
  isEditing = input(false);
  onSelect = output<JeuSummary>();
  onEdit = output<JeuSummary>();
  onDelete = output<JeuSummary>();

  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);

  selectJeu(): void {
    this.onSelect.emit(this.jeu());
  }

  editJeu(): void {
    this.onEdit.emit(this.jeu());
  }

  deleteJeu(): void {
    this.onDelete.emit(this.jeu());
  }
}
