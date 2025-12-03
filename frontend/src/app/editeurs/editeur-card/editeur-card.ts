import { Component, input, output } from '@angular/core';
import { EditeurDto } from '../../types/editeur-dto';

@Component({
  selector: 'app-editeur-card',
  imports: [],
  templateUrl: './editeur-card.html',
  styleUrl: './editeur-card.css'
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
