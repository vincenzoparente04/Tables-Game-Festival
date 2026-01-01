import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReservantDetail, TypeReservant, CreateReservantPayload } from '../../types/reservant-dto';
import { EditeurSummary } from '../../services/editeurs-service';
import { ReservantService } from '../../services/reservant-service';

@Component({
  selector: 'app-reservant-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reservant-form.html',
  styleUrl: './reservant-form.css',
})
export class ReservantForm {
  private snackBar = inject(MatSnackBar);
  private reservantService = inject(ReservantService);

  reservantToEdit = input<ReservantDetail | null>(null);
  editeurs = input<EditeurSummary[]>([]);

  created = output<void>();
  updated = output<void>();
  cancelled = output<void>();

  loading = signal(false);
  error = signal<string | null>(null);
  submitLabel = signal('Créer le réservant');

  // Types disponibles
  typesReservant: Array<{ value: TypeReservant; label: string; icon: string; color: string }> = [
    { value: 'editeur', label: 'Éditeur', icon: 'business', color: '#1976d2' },
    { value: 'prestataire', label: 'Prestataire', icon: 'engineering', color: '#7b1fa2' },
    { value: 'association', label: 'Association', icon: 'groups', color: '#388e3c' },
    { value: 'animation', label: 'Animation', icon: 'celebration', color: '#f57c00' },
    { value: 'boutique', label: 'Boutique', icon: 'storefront', color: '#c2185b' },
    { value: 'autre', label: 'Autre', icon: 'category', color: '#616161' }
  ];

  // Form
  form = new FormGroup({
    nom: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    type_reservant: new FormControl<TypeReservant>('editeur', { validators: [Validators.required], nonNullable: true }),
    editeur_id: new FormControl<number | null>(null),
    contacts: new FormArray([])
  });

  constructor() {
    effect(() => {
      const reservant = this.reservantToEdit();
      if (reservant && reservant.id > 0) {
        this.loadEditMode(reservant);
      } else {
        this.resetForm();
      }
    });
  }

  get contacts(): FormArray {
    return this.form.get('contacts') as FormArray;
  }

  get contactsFG(): FormGroup[] {
    return this.contacts.controls as FormGroup[];
  }

  private loadEditMode(reservant: ReservantDetail) {
    this.submitLabel.set('Modifier le réservant');
    this.form.patchValue({
      nom: reservant.nom,
      type_reservant: reservant.type_reservant,
      editeur_id: reservant.editeur_id || null
    });

    this.contacts.clear();
    if (reservant.contacts && reservant.contacts.length > 0) {
      reservant.contacts.forEach(contact => {
        this.contacts.push(new FormGroup({
          nom: new FormControl(contact.nom, [Validators.required]),
          email: new FormControl(contact.email || ''),
          telephone: new FormControl(contact.telephone || ''),
          role_profession: new FormControl(contact.role_profession || '')
        }));
      });
    }
  }

  private resetForm() {
    this.submitLabel.set('Créer le réservant');
    this.form.reset({
      nom: '',
      type_reservant: 'editeur',
      editeur_id: null
    });
    this.contacts.clear();
    this.error.set(null);
  }

  addContact() {
    this.contacts.push(new FormGroup({
      nom: new FormControl('', [Validators.required]),
      email: new FormControl(''),
      telephone: new FormControl(''),
      role_profession: new FormControl('')
    }));
  }

  removeContact(index: number) {
    this.contacts.removeAt(index);
  }

  submit() {
    if (this.form.invalid) {
      this.error.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const payload: CreateReservantPayload = {
      nom: this.form.value.nom!,
      type_reservant: this.form.value.type_reservant!,
      editeur_id: this.form.value.editeur_id || undefined,
      contacts: this.form.value.contacts as any
    };

    const reservant = this.reservantToEdit();
    const operation$ = reservant && reservant.id > 0
      ? this.reservantService.updateReservant(reservant.id, payload)
      : this.reservantService.createReservant(payload);

    operation$.subscribe({
      next: () => {
        this.loading.set(false);
        const message = reservant ? 'Réservant modifié' : 'Réservant créé';
        this.snackBar.open(message, 'OK', { duration: 3000 });
        this.resetForm();
        if (reservant) {
          this.updated.emit();
        } else {
          this.created.emit();
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err?.error?.error || 'Erreur lors de l\'enregistrement';
        this.error.set(errorMsg);
        this.snackBar.open(errorMsg, 'Fermer', { duration: 5000 });
      }
    });
  }

  cancel() {
    this.resetForm();
    this.cancelled.emit();
  }

}
