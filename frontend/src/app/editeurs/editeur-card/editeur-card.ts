import { Component, input, output } from '@angular/core';
import { EditeurDto } from '../../types/editeur-dto';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editeur-card',
  standalone: true,
  imports: [MatCardModule,MatButtonModule,MatIconModule,MatChipsModule, CommonModule],
  templateUrl: './editeur-card.html',
  styleUrl: './editeur-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditeurCard {
  editeur = input<EditeurDto>();
  //permissions
  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);

  voirJeux = output<number>();
  
  edit = output<EditeurDto>();
  delete = output<number>();
}
