import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Facture, CreateFacturePayload, RecapFacture } from '../types/factures-dto';

@Injectable({
  providedIn: 'root',
})
export class FacturesService {
  private API = `${environment.apiUrl}/factures`;

  constructor(private http: HttpClient) {}

  /**
   * Crée une nouvelle facture
   */
  creerFacture(payload: CreateFacturePayload): Observable<Facture> {
    return this.http.post<Facture>(this.API, payload);
  }

  /**
   * Récupère une facture par ID de réservation
   */
  getByReservation(reservationId: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.API}/by-reservation/${reservationId}`);
  }

  /**
   * Récupère toutes les factures
   */
  getAll(): Observable<Facture[]> {
    return this.http.get<Facture[]>(this.API);
  }

  /**
   * Met à jour le statut de paiement
   */
  updateStatutPaiement(
    factureId: number,
    statut: 'non_paye' | 'partiel' | 'paye'
  ): Observable<Facture> {
    return this.http.put<Facture>(`${this.API}/${factureId}/statut`, {
      statut_paiement: statut,
    });
  }
}

