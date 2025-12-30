import { Component, input, output, signal, effect, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormArray, Validators } from '@angular/forms';
import { CreateEditeurPayload, EditeursService, EditeurSummary, ContactEditeur} from '../../services/editeurs-service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-editeurs-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './editeurs-form.html',
  styleUrl: './editeurs-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditeursForm {
  private readonly editeursService = inject(EditeursService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  // Inputs
  editeurToEdit = input<EditeurSummary | null>(null);
  contactsToEdit = input<ContactEditeur[]>([]);

  // Outputs
  created = output<void>();
  updated = output<void>();

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  submitLabel = signal('Créer l\'éditeur');

  // Form
  form = new FormGroup({
    nom: new FormControl('', [Validators.required, Validators.minLength(1)]),
    contacts: new FormArray([]),
  });

  constructor() {
    effect(() => {
      const editeur = this.editeurToEdit();
      const contactsData = this.contactsToEdit();
      if (editeur && editeur.id > 0) {
        this.loadEditMode(editeur, contactsData);
      } else {
        this.resetForm();
      }
    });
  }

  private loadEditMode(editeur: EditeurSummary, contacts: ContactEditeur[]): void {
    this.form.get('nom')?.setValue(editeur.nom);
    this.submitLabel.set('Modifier l\'éditeur');
    
    const contactsArray = this.form.get('contacts') as FormArray;
    contactsArray.clear();
    
    contacts.forEach(contact => {
      contactsArray.push(
        new FormGroup({
          id: new FormControl(contact.id),
          nom: new FormControl(contact.nom || '', Validators.required),
          email: new FormControl(contact.email || ''),
          telephone: new FormControl(contact.telephone || ''),
          role_profession: new FormControl(contact.role_profession || ''),
        })
      );
    });
  }

  private resetForm(): void {
    this.form.get('nom')?.setValue('');
    this.submitLabel.set('Créer l\'éditeur');
    this.error.set(null);
    
    const contactsArray = this.form.get('contacts') as FormArray;
    contactsArray.clear();
  }

  get contacts(): FormArray {
    return this.form.get('contacts') as FormArray;
  }

  addContact(): void {
    this.contacts.push(
      new FormGroup({
        nom: new FormControl('', Validators.required),
        email: new FormControl(''),
        telephone: new FormControl(''),
        role_profession: new FormControl(''),
      })
    );
  }

  removeContact(index: number): void {
    this.contacts.removeAt(index);
  }

  cancel(): void {
    this.resetForm();
  }

  submit(): void {
    this.error.set(null);

    if (this.form.invalid) {
      this.error.set('Veuillez remplir les champs obligatoires');
      return;
    }

    this.loading.set(true);
    const nom = this.form.get('nom')?.value?.trim();

    if (!nom) {
      this.error.set("Le nom de l'éditeur est requis");
      this.loading.set(false);
      return;
    }

    const contactsData = (this.form.get('contacts') as FormArray).value
      .filter((c: any) => c.nom && c.nom.trim() !== '')
      .map((c: any) => ({
        nom: c.nom.trim(),
        email: c.email?.trim() || undefined,
        telephone: c.telephone?.trim() || undefined,
        role_profession: c.role_profession?.trim() || undefined,
      }));

    const editeur = this.editeurToEdit();
    if (editeur && editeur.id > 0) {
      // Mode Edit
      const payload = {
        nom: nom.trim(),
        contacts: contactsData,
      };

      this.editeursService.updateEditeur(editeur.id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Éditeur modifié avec succès', 'Fermer', { duration: 3000 });
          this.resetForm();
          this.updated.emit();
        },
        error: (err) => {
          console.error(err);
          const errorMsg = err?.error?.error || "Erreur lors de la modification de l'éditeur";
          this.error.set(errorMsg);
          this.loading.set(false);
          this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
        },
      });
    } else {
      // Mode Create
      const payload: CreateEditeurPayload = {
        nom: nom.trim(),
      };

      if (contactsData.length > 0) {
        payload.contacts = contactsData;
      }

      this.editeursService.createEditeur(payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('Éditeur créé avec succès', 'Fermer', { duration: 3000 });
          this.resetForm();
          this.created.emit();
        },
        error: (err) => {
          console.error(err);
          const errorMsg = err?.error?.error || "Erreur lors de la création de l'éditeur";
          this.error.set(errorMsg);
          this.loading.set(false);
          this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
        },
      });
    }
  }
}
