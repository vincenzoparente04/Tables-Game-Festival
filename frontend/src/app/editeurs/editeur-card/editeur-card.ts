import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditeurSummary } from '../../services/editeurs-service';

@Component({
  selector: 'app-editeur-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editeur-card.html',
  styleUrl: './editeur-card.css',
})
export class EditeurCard {
  @Input() editeur!: EditeurSummary;

  // Highlight selected editor
  @Input() selected = false;

  @Output() select = new EventEmitter<EditeurSummary>();
  @Output() edit = new EventEmitter<EditeurSummary>();
  @Output() delete = new EventEmitter<EditeurSummary>();

  onClick(): void {
    this.select.emit(this.editeur);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.editeur);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.editeur);
  }
}
