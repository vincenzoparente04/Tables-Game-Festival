import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditeurSummary } from '../../services/editeurs-service';

@Component({
  selector: 'app-editeur-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editeur-card.html',
  styleUrl: './editeur-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditeurCard {
  editeur = input.required<EditeurSummary>();
  selected = input(false);

  onSelect = output<EditeurSummary>();
  onEdit = output<EditeurSummary>();
  onDelete = output<EditeurSummary>();

  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);

  selectEditeur(): void {
    this.onSelect.emit(this.editeur());
  }

  editEditeur(event: Event): void {
    event.stopPropagation();
    this.onEdit.emit(this.editeur());
  }

  deleteEditeur(event: Event): void {
    event.stopPropagation();
    this.onDelete.emit(this.editeur());
  }
}
