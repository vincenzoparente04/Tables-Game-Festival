import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

// GET /api/editeurs result
export interface EditeurSummary {
  id: number;
  nom: string;
  nb_jeux: number;
  nb_contacts: number;
}

// GET /api/editeurs/:id/jeux result
export interface JeuEditeur {
  id: number;
  nom: string;
  type_jeu: string | null;
  age_mini: number | null;
  age_maxi: number | null;
  joueurs_mini: number | null;
  joueurs_maxi: number | null;
  taille_table: string | null;
  duree_moyenne: number | null;
}

// GET /api/editeurs/:id/contacts result
export interface ContactEditeur {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
  role_profession: string | null;
  reservant_id: number;
  reservant_nom: string;
  type_reservant: string;
}

// interface for POST /api/editeurs
export interface CreateEditeurPayload {
  nom: string;
  contacts?: {
    nom: string;
    email?: string;
    telephone?: string;
    role_profession?: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class EditeursService {
  private baseUrl = `${environment.apiUrl}/editeurs`;

  constructor(private http: HttpClient) {}

  // List of editor
  getEditeurs(): Observable<EditeurSummary[]> {
    return this.http.get<EditeurSummary[]>(this.baseUrl);
  }

  // Editor's game
  getJeuxEditeur(editeurId: number): Observable<JeuEditeur[]> {
    return this.http.get<JeuEditeur[]>(`${this.baseUrl}/${editeurId}/jeux`);
  }

  // Editors contacts
  getContactsEditeur(editeurId: number): Observable<ContactEditeur[]> {
    return this.http.get<ContactEditeur[]>(
      `${this.baseUrl}/${editeurId}/contacts`
    );
  }

  // Create editor
  createEditeur(payload: CreateEditeurPayload) {
    return this.http.post(`${this.baseUrl}`, payload);
  }

  // Update editor
  updateEditeur(editeurId: number, payload: { nom: string; contacts?: Array<{ nom: string; email?: string; telephone?: string; role_profession?: string }> }) {
    return this.http.put(`${this.baseUrl}/${editeurId}`, payload);
  }

  // Delete editor
  deleteEditeur(editeurId: number) {
    return this.http.delete(`${this.baseUrl}/${editeurId}`);
  }
}
