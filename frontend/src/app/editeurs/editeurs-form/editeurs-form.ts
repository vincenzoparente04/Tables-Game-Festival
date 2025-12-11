import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateEditeurPayload, EditeursService} from '../../services/editeurs-service';

@Component({
  selector: 'app-editeurs-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editeurs-form.html',
  styleUrl: './editeurs-form.css',
})
export class EditeursForm {
  
  @Output() created = new EventEmitter<void>();

  // Form fields
  nom = '';
  contactNom = '';
  contactEmail = '';
  contactTelephone = '';
  contactRole = '';

  loading = false;
  error: string | null = null;

  constructor(private editeursService: EditeursService) {}
  
  submit(): void {
    this.error = null;
    this.loading = true;

    if (!this.nom || this.nom.trim() === '') {
      this.error = "Le nom de l'éditeur est requis";
      return;
    }

    // Prepare the payload for backend
    const payload: CreateEditeurPayload = {
      nom: this.nom.trim(),
    };

    // If the contact has a name is added
    if (this.contactNom && this.contactNom.trim() !== '') {
      payload.contacts = [
        {
          nom: this.contactNom.trim(),
          email: this.contactEmail || undefined,
          telephone: this.contactTelephone || undefined,
          role_profession: this.contactRole || undefined,
        },
      ];
    }

    this.loading = true;

    this.editeursService.createEditeur(payload).subscribe({
      next: () => {
        this.loading = false;
        // If the contact has a name is saved
        this.nom = '';
        this.contactNom = '';
        this.contactEmail = '';
        this.contactTelephone = '';
        this.contactRole = '';
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
