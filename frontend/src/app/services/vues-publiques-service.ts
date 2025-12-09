import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JeuPublicFestival {
  jeu_id: number;
  jeu_nom: string;
  type_jeu: string | null;
  age_mini: number | null;
  age_maxi: number | null;
  joueurs_mini: number | null;
  joueurs_maxi: number | null;
  duree_moyenne: number | null;
  taille_table: 'petite' | 'grande' | null;
  editeur_id: number;
  editeur_nom: string;
  auteurs: string | null;
  festival_id: number;
  festival_nom: string;
  zone_plan_id: number | null;
  zone_plan_nom: string | null;
  presente_par: string;
  nombre_exemplaires: number;
}

@Injectable({
  providedIn: 'root'
})
export class VuesPubliquesService {
   private baseUrl = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

   getJeuxFestivalCourant(): Observable<JeuPublicFestival[]> {
    return this.http.get<JeuPublicFestival[]>(`${this.baseUrl}/jeux/festival-courant`);
  }

  
}
