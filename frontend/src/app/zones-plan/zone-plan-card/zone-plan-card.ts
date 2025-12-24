import { Component, input, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { ZonePlanDto, JeuFestivalDto } from '../../types/zone-plan-dto';
import { ZonesPlanService } from '../zones-plan-service';

@Component({
  selector: 'app-zone-plan-card',
  standalone: true,
  imports: [CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule],
  templateUrl: './zone-plan-card.html',
  styleUrl: './zone-plan-card.css',
})
export class ZonePlanCard {
  private zonesPlanService = inject(ZonesPlanService);

  zone = input.required<ZonePlanDto>();
  canModify = input<boolean>(false);
  canDelete = input<boolean>(false);
  canPlace = input<boolean>(false);

  edit = output<ZonePlanDto>();
  delete = output<number>();
  placerJeu = output<ZonePlanDto>();
  retirerJeu = output<number>();

  jeux = signal<JeuFestivalDto[]>([]);
  loadingJeux = signal(false);

  constructor() {
    effect(() => {
      const z = this.zone();
      if (z) {
        this.loadJeux();
      }
    });
  }

  private loadJeux() {
    this.loadingJeux.set(true);
    this.zonesPlanService.getJeuxByZone(this.zone().id).subscribe({
      next: (jeux) => {
        this.jeux.set(jeux);
        this.loadingJeux.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement jeux:', err);
        this.jeux.set([]);
        this.loadingJeux.set(false);
      }
    });
  }

  getOccupationRate(): number {
    const zone = this.zone();
    if (!zone || zone.nombre_tables_total === 0) return 0;
    return Math.round(((zone.tables_utilisees || 0) / zone.nombre_tables_total) * 100);
  }

  refreshJeux() {
    this.loadJeux();
  }

}
