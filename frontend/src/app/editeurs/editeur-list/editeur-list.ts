import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EditeurCard } from '../editeur-card/editeur-card';
import { EditeurForm } from '../editeur-form/editeur-form';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';




@Component({
  selector: 'app-editeur-list',
  standalone: true,
  imports: [EditeurCard,EditeurForm,CommonModule,RouterModule,MatButtonModule,MatFormFieldModule,MatIconModule,MatInputModule,MatProgressSpinnerModule,MatSnackBar,MatSnackBarModule,ReactiveFormsModule],
  templateUrl: './editeur-list.html',
  styleUrl: './editeur-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditeurList {
  //todo (use festival list to get inspired)
}
