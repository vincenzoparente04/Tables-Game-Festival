import { Component, OnInit } from '@angular/core';
import { VuesPubliquesService, JeuPublicFestival } from '../services/vues-publiques-service';

@Component({
  selector: 'app-vues-publiques',
  imports: [],
  templateUrl: './vues-publiques.html',
  styleUrl: './vues-publiques.css'
})
export class VuesPubliques implements OnInit{
  jeuxFestival: JeuPublicFestival[] = [];

  loadingFestival = false;
  errorFestival: string | null = null;

  constructor(private vuesService: VuesPubliquesService) {}

  ngOnInit(): void {
    this.loadJeuxFestival();
  }

  private loadJeuxFestival(): void {
    this.loadingFestival = true;
    this.errorFestival = null;

    this.vuesService.getJeuxFestivalCourant().subscribe({
      next: (data) => {
        this.jeuxFestival = data;
        this.loadingFestival = false;
      },
      error: (err) => {
        console.error(err);
        this.errorFestival = 'Erreur lors du chargement des jeux du festival courant';
        this.loadingFestival = false;
      }
    });
  }
}
