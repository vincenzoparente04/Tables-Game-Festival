import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

// Author interface
export interface Auteur {
  id?: number;
  nom: string;
  prenom?: string;
}

// Game summary (from GET /api/jeux)
export interface JeuSummary {
  id: number;
  nom: string;
  editeur_id: number;
  editeur_nom: string;
  type_jeu: string | null;
  age_mini: number | null;
  age_maxi: number | null;
  joueurs_mini: number | null;
  joueurs_maxi: number | null;
  taille_table: string | null;
  duree_moyenne: number | null;
  auteurs: Auteur[];
}

// Payload for creating a game
export interface CreateJeuPayload {
  nom: string;
  editeur_id: number;
  type_jeu?: string;
  age_mini?: number;
  age_maxi?: number;
  joueurs_mini?: number;
  joueurs_maxi?: number;
  taille_table?: string;
  duree_moyenne?: number;
  auteurs: Auteur[];
}

@Injectable({
  providedIn: 'root',
})
export class JeuxService {
  private baseUrl = `${environment.apiUrl}/jeux`;

  constructor(private http: HttpClient) {}

  // Get all games
  getJeux(): Observable<JeuSummary[]> {
    return this.http.get<JeuSummary[]>(this.baseUrl);
  }

  // Get a specific game
  getJeu(jeuId: number): Observable<JeuSummary> {
    return this.http.get<JeuSummary>(`${this.baseUrl}/${jeuId}`);
  }

  // Create a new game
  createJeu(payload: CreateJeuPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}`, payload);
  }

  // Update a game
  updateJeu(jeuId: number, payload: CreateJeuPayload): Observable<any> {
    return this.http.put(`${this.baseUrl}/${jeuId}`, payload);
  }

  // Delete a game
  deleteJeu(jeuId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${jeuId}`);
  }
}
