import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReservantSummary, ReservantDetail, CreateReservantPayload, UpdateReservantPayload,ContactReservant,TypeReservant} from '../types/reservant-dto';

@Injectable({
  providedIn: 'root',
})
export class ReservantService {
  
  private readonly API = `${environment.apiUrl}/reservants`;

  constructor(private http: HttpClient) {}


  // Liste tous les réservants
  getReservants(): Observable<ReservantSummary[]> {
    return this.http.get<ReservantSummary[]>(this.API);
  }

  // Détail complet d'un réservant (avec contacts et historique)
  getReservantById(id: number): Observable<ReservantDetail> {
    return this.http.get<ReservantDetail>(`${this.API}/${id}`);
  }

  // Contacts d'un réservant
  getContactsReservant(id: number): Observable<ContactReservant[]> {
    return this.http.get<ContactReservant[]>(`${this.API}/${id}/contacts`);
  }

  // Créer un réservant
  createReservant(payload: CreateReservantPayload): Observable<ReservantDetail> {
    return this.http.post<ReservantDetail>(this.API, payload);
  }

  // Mettre à jour un réservant
  updateReservant(id: number, payload: UpdateReservantPayload): Observable<ReservantDetail> {
    return this.http.put<ReservantDetail>(`${this.API}/${id}`, payload);
  }

  // Supprimer un réservant
  deleteReservant(id: number): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  // Helper: Obtenir le label français du type
  static getTypeLabel(type: TypeReservant): string {
    const labels: Record<TypeReservant, string> = {
      'editeur': 'Éditeur',
      'prestataire': 'Prestataire',
      'association': 'Association',
      'animation': 'Animation',
      'boutique': 'Boutique',
      'autre': 'Autre'
    };
    return labels[type] || type;
  }

  // Helper: Obtenir l'icône du type
  static getTypeIcon(type: TypeReservant): string {
    const icons: Record<TypeReservant, string> = {
      'editeur': 'business',
      'prestataire': 'engineering',
      'association': 'groups',
      'animation': 'celebration',
      'boutique': 'storefront',
      'autre': 'category'
    };
    return icons[type] || 'help';
  }

  // Helper: Obtenir la couleur du type
  static getTypeColor(type: TypeReservant): string {
    const colors: Record<TypeReservant, string> = {
      'editeur': '#1976d2',
      'prestataire': '#7b1fa2',
      'association': '#388e3c',
      'animation': '#f57c00',
      'boutique': '#c2185b',
      'autre': '#616161'
    };
    return colors[type] || '#616161';
  }
}
