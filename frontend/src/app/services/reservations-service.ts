import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ReservationSummary,
  ReservationDetail,
  CreateReservationPayload,
  UpdateReservationPayload,
  AddJeuToReservationPayload,
  ContactReservation,
  RecapitulatifReservation,
  EtatContact,
  EtatPresence
} from '../types/reservation-dto';


@Injectable({
  providedIn: 'root',
})
export class ReservationsService {
  private API = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  // Liste toutes les réservations d'un festival
  getByFestival(festivalId: number): Observable<ReservationSummary[]> {
    return this.http.get<ReservationSummary[]>(`${this.API}/festival/${festivalId}`);
  }

  // Détail complet d'une réservation
  getById(id: number): Observable<ReservationDetail> {
    return this.http.get<ReservationDetail>(`${this.API}/${id}`);
  }

  // Créer une réservation
  create(festivalId: number, payload: CreateReservationPayload): Observable<ReservationDetail> {
    return this.http.post<ReservationDetail>(`${this.API}/festival/${festivalId}`, payload);
  }

  // Mettre à jour une réservation
  update(id: number, payload: UpdateReservationPayload): Observable<ReservationDetail> {
    return this.http.patch<ReservationDetail>(`${this.API}/${id}`, payload);
  }

  // Supprimer une réservation
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  // Workflow - Ajouter un contact/relance
  addContact(reservationId: number, contact: Partial<ContactReservation>): Observable<ContactReservation> {
    return this.http.post<ContactReservation>(`${this.API}/${reservationId}/contacts`, contact);
  }

  // Workflow - Mettre à jour l'état de contact
  updateEtatContact(reservationId: number, etat: EtatContact): Observable<ReservationDetail> {
    return this.http.patch<ReservationDetail>(`${this.API}/${reservationId}/workflow/contact`, { etat_contact: etat });
  }

  // Workflow - Mettre à jour l'état de présence
  updateEtatPresence(reservationId: number, etat: EtatPresence): Observable<ReservationDetail> {
    return this.http.patch<ReservationDetail>(`${this.API}/${reservationId}/workflow/presence`, { etat_presence: etat });
  }

  // Ajouter un jeu à la réservation
  addJeu(reservationId: number, payload: AddJeuToReservationPayload): Observable<any> {
    return this.http.post(`${this.API}/${reservationId}/jeux`, payload);
  }

  // Retirer un jeu de la réservation
  removeJeu(reservationId: number, jeuFestivalId: number): Observable<any> {
    return this.http.delete(`${this.API}/${reservationId}/jeux/${jeuFestivalId}`);
  }

  // Marquer un jeu comme reçu
  marquerJeuRecu(reservationId: number, jeuFestivalId: number, recu: boolean): Observable<any> {
    return this.http.patch(`${this.API}/${reservationId}/jeux/${jeuFestivalId}/recu`, { jeu_recu: recu });
  }

  // Récapitulatif pour facturation
  getRecapitulatif(festivalId: number): Observable<RecapitulatifReservation[]> {
    return this.http.get<RecapitulatifReservation[]>(`${this.API}/festival/${festivalId}/recapitulatif`);
  }

  // Générer une facture
  genererFacture(reservationId: number): Observable<any> {
    return this.http.post(`${this.API}/${reservationId}/facture`, {});
  }

  // Helpers statiques pour l'UI
  static getEtatContactLabel(etat: EtatContact): string {
    const labels: Record<EtatContact, string> = {
      'pas_contacte': 'Pas contacté',
      'contacte': 'Contacté',
      'en_discussion': 'En discussion',
      'reserve': 'Réservé',
      'liste_jeux_demandee': 'Liste jeux demandée',
      'liste_jeux_obtenue': 'Liste jeux obtenue',
      'jeux_recus': 'Jeux reçus'
    };
    return labels[etat];
  }

  static getEtatContactColor(etat: EtatContact): string {
    const colors: Record<EtatContact, string> = {
      'pas_contacte': '#9e9e9e',
      'contacte': '#2196f3',
      'en_discussion': '#ff9800',
      'reserve': '#4caf50',
      'liste_jeux_demandee': '#9c27b0',
      'liste_jeux_obtenue': '#673ab7',
      'jeux_recus': '#00bcd4'
    };
    return colors[etat];
  }

  static getEtatPresenceLabel(etat: EtatPresence): string {
    const labels: Record<EtatPresence, string> = {
      'non_defini': 'Non défini',
      'present': 'Présent',
      'considere_absent': 'Considéré absent',
      'absent': 'Absent'
    };
    return labels[etat];
  }

  static getEtatPresenceColor(etat: EtatPresence): string {
    const colors: Record<EtatPresence, string> = {
      'non_defini': '#9e9e9e',
      'present': '#4caf50',
      'considere_absent': '#ff9800',
      'absent': '#f44336'
    };
    return colors[etat];
  }

}
