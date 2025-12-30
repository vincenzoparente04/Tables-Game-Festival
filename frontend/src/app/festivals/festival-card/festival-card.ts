import { Component, input, output, inject, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FestivalsDto } from '../../types/festivals-dto';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ZonesTarifService } from '../../zones-tarifaires/zones-tarif-service';
import { ZonesTarifairesList }from '../../zones-tarifaires/zones-tarifaires-list/zones-tarifaires-list'; 


@Component({
  selector: 'app-festival-card',
  standalone: true,
  imports: [RouterModule, CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, ZonesTarifairesList],
  templateUrl: './festival-card.html',
  styleUrl: './festival-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FestivalCard {

  festival = input<FestivalsDto>();
  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);
  showStocks = input<boolean>(false);
  canSetCourant = input<boolean>(false);
  setCourant = output<number>();
  edit = output<FestivalsDto>();
  delete = output<number>();

  showZonesTarifaires = input<boolean>(false);
  canManageZones = input<boolean>(false);
  zonesChanged = output<void>();

  canViewZonesPlan = input<boolean>(false); 

  

}
