import { Component, EventEmitter, Output, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateEditeurPayload, EditeursService, EditeurSummary, ContactEditeur} from '../../services/editeurs-service';

@Component({
  selector: 'app-editeurs-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editeurs-form.html',
  styleUrl: './editeurs-form.css',
})
export class EditeursForm implements OnChanges {
  
  @Output() created = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();
  @Input() editeurToEdit: EditeurSummary | null = null;
  @Input() contactsToEdit: ContactEditeur[] = [];

  // Form fields
  nom = '';
  contacts: Array<{ id?: number; nom: string; email?: string; telephone?: string; role_profession?: string }> = [];

  loading = false;
  error: string | null = null;

  constructor(private editeursService: EditeursService) {}

  ngOnChanges(): void {
    if (this.editeurToEdit) {
      this.nom = this.editeurToEdit.nom;
      this.contacts = this.contactsToEdit.map(c => ({
        id: c.id,
        nom: c.nom,
        email: c.email || undefined,
        telephone: c.telephone || undefined,
        role_profession: c.role_profession || undefined,
      }));
    } else {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.nom = '';
    this.contacts = [];
  }

  cancel(): void {
    this.resetForm();
    this.editeurToEdit = null;
  }

  addContact(): void {
    this.contacts.push({
      nom: '',
      email: undefined,
      telephone: undefined,
      role_profession: undefined,
    });
  }

  removeContact(index: number): void {
    this.contacts.splice(index, 1);
  }
  
  submit(): void {
    this.error = null;
    this.loading = true;

    if (!this.nom || this.nom.trim() === '') {
      this.error = "Le nom de l'éditeur est requis";
      this.loading = false;
      return;
    }

    // Mode Edit
    if (this.editeurToEdit) {
      const payload = {
        nom: this.nom.trim(),
        contacts: this.contacts.map(c => ({
          nom: c.nom.trim(),
          email: c.email || undefined,
          telephone: c.telephone || undefined,
          role_profession: c.role_profession || undefined,
        })).filter(c => c.nom !== ''),
      };

      this.editeursService.updateEditeur(this.editeurToEdit.id, payload).subscribe({
        next: () => {
          this.loading = false;
          this.resetForm();
          this.updated.emit();
        },
        error: (err) => {
          console.error(err);
          this.error =
            err?.error?.error || "Erreur lors de la modification de l'éditeur";
          this.loading = false;
        },
      });
    } else {
      
      // Mode Create
      const payload: CreateEditeurPayload = {
        nom: this.nom.trim(),
      };

      const validContacts = this.contacts.filter(c => c.nom && c.nom.trim() !== '');
      if (validContacts.length > 0) {
        payload.contacts = validContacts.map(c => ({
          nom: c.nom.trim(),
          email: c.email || undefined,
          telephone: c.telephone || undefined,
          role_profession: c.role_profession || undefined,
        }));
      }

      this.editeursService.createEditeur(payload).subscribe({
        next: () => {
          this.loading = false;
          this.resetForm();
          this.created.emit();
        },
        error: (err) => {
          console.error(err);
          this.error =
            err?.error?.error || "Erreur lors de la création de l'éditeur";
          this.loading = false;
        },
      });
    }
  }
}
