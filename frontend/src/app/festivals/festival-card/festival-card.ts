import { Component, input, output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FestivalsDto } from '../../types/festivals-dto';

@Component({
  selector: 'app-festival-card',
  standalone: true,
  imports: [CommonModule,MatCardModule,MatButtonModule,MatIconModule,MatChipsModule],
  templateUrl: './festival-card.html',
  styleUrl: './festival-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FestivalCard {
  festival = input<FestivalsDto>();
  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);
  showStocks = input<boolean>(false);
  setCourant = output<number>();
  edit = output<FestivalsDto>();
  delete = output<number>();

}
