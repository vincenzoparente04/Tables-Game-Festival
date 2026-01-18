import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { ReservationDetails, ContactReservation } from '../../types/reservation-dto';
import { ReservationsService } from '../../services/reservations-service';
import { PermissionsService } from '../../services/permissions-service';
import { FacturesService } from '../../services/factures-service';
import { AddJeuDialog } from '../add-jeu-dialog/add-jeu-dialog';
import { AddContactDialog } from '../add-contact-dialog/add-contact-dialog';
import { EditReservationDialog } from '../edit-reservation-dialog/edit-reservation-dialog';
import { RecapFacture } from '../../types/factures-dto';

@Component({
  selector: 'app-reservation-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTableModule,
    MatDividerModule,
    MatListModule
  ],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reservationsService = inject(ReservationsService);
  private facturesService = inject(FacturesService);
  private permissions = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  reservationId = signal<number>(0);
  reservation = signal<ReservationDetails | null>(null);
  loading = signal(false);
  generatingFacture = signal(false);
  factureExistante = signal<any>(null);
  loadingFacture = signal(false);

  // Signaux computed pour la facture
  factureExiste = computed(() => !!this.factureExistante());
  texteBoutonFacture = computed(() => 
    this.factureExiste() ? ' Modifier facture' : ' Générer facture'
  );

  readonly canModify = this.permissions.can('reservations', 'update');
  readonly canDelete = this.permissions.can('reservations', 'delete');
  readonly canUpdateWorkflow = this.permissions.can('reservations', 'updateWorkflow');

  // Calculs
  montantTotal = computed(() => {
    const res = this.reservation();
    if (!res) return 0;
    
    // Calcul de la valeur des tables remisées
    let montantRemiseTables = 0;
    if ((res.remise_tables || 0) > 0) {
      // Calculer le prix moyen par table à partir des zones réservées
      let totalMontantTables = 0;
      let totalTables = 0;
      
      (res.zones_reservees || []).forEach((zone: any) => {
        const nbTables = zone.nombre_tables || 0;
        const prixUnitaire = zone.prix_unitaire || 0;
        totalMontantTables += nbTables * prixUnitaire;
        totalTables += nbTables;
      });
      
      if (totalTables > 0) {
        const prixMoyenParTable = totalMontantTables / totalTables;
        montantRemiseTables = prixMoyenParTable * (res.remise_tables || 0);
      }
    }
    
    return (res.montant_brut || 0) - (res.remise_montant || 0) - montantRemiseTables;
  });

  recapFacture = computed<RecapFacture | null>(() => {
    const res = this.reservation();
    if (!res) return null;

    const montantRemiseTables = this.calculateMontantRemiseTables();
    const montantTotal = this.montantTotal();

    return {
      reservation_id: res.id,
      reservant_nom: res.reservant_nom,
      montant_tables: res.montant_tables || 0,
      montant_prises: res.montant_prises || 0,
      montant_brut: res.montant_brut || 0,
      remise_montant: res.remise_montant || 0,
      remise_tables_montant: montantRemiseTables,
      montant_total: montantTotal,
      zones: (res.zones_reservees || []).map(zone => ({
        nom: zone.zone_tarifaire_nom || 'Zone',
        nb_tables: zone.nombre_tables,
        prix_unitaire: zone.prix_unitaire,
        total: zone.nombre_tables * zone.prix_unitaire
      }))
    };
  });

  constructor() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.reservationId.set(id);
        this.loadReservation();
      }
    });
  }

  private loadReservation() {
    this.loading.set(true);
    this.reservationsService.getById(this.reservationId()).subscribe({
      next: (detail) => {
        this.reservation.set(detail);
        this.loading.set(false);
        // Charge the invoice if any
        this.loadFacture();
      },
      error: (err) => {
        console.error('Errore chargement réservation:', err);
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadFacture() {
    this.loadingFacture.set(true);
    this.facturesService.getByReservation(this.reservationId()).subscribe({
      next: (facture) => {
        if (facture) {
          this.factureExistante.set(facture);
        } else {
          this.factureExistante.set(null);
        }
        this.loadingFacture.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement facture:', err);
        this.factureExistante.set(null);
        this.loadingFacture.set(false);
      }
    });
  }

  // Actions principales
  editReservation() {
    const dialogRef = this.dialog.open(EditReservationDialog, {
      width: '600px',
      data: { reservation: this.reservation() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reservationsService.update(this.reservationId(), result).subscribe({
          next: () => {
            this.snackBar.open('Réservation mise à jour', 'OK', { duration: 2000 });
            this.loadReservation();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteReservation() {
    const res = this.reservation();
    if (!res) return;

    if (confirm(`⚠️ Supprimer la réservation de "${res.reservant_nom}" ?\n\nCette action est irréversible.`)) {
      this.reservationsService.delete(this.reservationId()).subscribe({
        next: () => {
          this.snackBar.open('Réservation supprimée', 'OK', { duration: 2000 });
          this.router.navigate(['/festivals', res.festival_id, 'reservations']);
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // Workflow
  updateEtatContact(nouvelEtat: string) {
    this.reservationsService.updateEtatContact(this.reservationId(), nouvelEtat as any).subscribe({
      next: () => {
        // Mise à jour locale du signal
        const currentRes = this.reservation();
        if (currentRes) {
          currentRes.etat_contact = nouvelEtat as any;
          this.reservation.set({...currentRes});
        }
        this.snackBar.open('État de contact mis à jour', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  updateEtatPresence(nouvelEtat: string) {
    this.reservationsService.updateEtatPresence(this.reservationId(), nouvelEtat as any).subscribe({
      next: () => {
        // Mise à jour locale du signal
        const currentRes = this.reservation();
        if (currentRes) {
          currentRes.etat_presence = nouvelEtat as any;
          this.reservation.set({...currentRes});
        }
        this.snackBar.open('État de présence mis à jour', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  addContact() {
    const dialogRef = this.dialog.open(AddContactDialog, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((contact: Partial<ContactReservation>) => {
      if (contact) {
        this.reservationsService.addContact(this.reservationId(), contact).subscribe({
          next: (newContact: ContactReservation) => {
            // Mise à jour locale du signal au lieu de recharger tout
            const currentRes = this.reservation();
            if (currentRes) {
              currentRes.contacts = [...(currentRes.contacts || []), newContact];
              this.reservation.set({...currentRes}); // Trigger signal update
            }
            this.snackBar.open('Contact ajouté', 'OK', { duration: 2000 });
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de l\'ajout';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  // Jeux
  addJeu() {
    const res = this.reservation();
    if (!res) return;

    // Récupérer les IDs des jeux déjà ajoutés à cette réservation
    const jeuxDejaAjoutes = res.jeux.map(j => j.jeu_id);

    const dialogRef = this.dialog.open(AddJeuDialog, {
      width: '600px',
      data: { 
        festivalId: res.festival_id,
        tablesRestantes: this.getTablesRestantes(),
        jeuxDejaAjoutes: jeuxDejaAjoutes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reservationsService.addJeu(this.reservationId(), result).subscribe({
          next: (newJeu) => {
            // Mise à jour locale du signal au lieu de recharger tout
            const currentRes = this.reservation();
            if (currentRes) {
              currentRes.jeux = [...(currentRes.jeux || []), newJeu];
              this.reservation.set({...currentRes}); // Trigger signal update
            }
            this.snackBar.open('Jeu ajouté', 'OK', { duration: 2000 });
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de l\'ajout';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  removeJeu(jeuFestivalId: number, jeuNom: string) {
    if (confirm(`Retirer "${jeuNom}" de la réservation ?`)) {
      this.reservationsService.removeJeu(this.reservationId(), jeuFestivalId).subscribe({
        next: () => {
          // Mise à jour locale du signal au lieu de recharger tout
          const currentRes = this.reservation();
          if (currentRes) {
            currentRes.jeux = currentRes.jeux.filter(j => j.id !== jeuFestivalId);
            this.reservation.set({...currentRes}); // Trigger signal update
          }
          this.snackBar.open('Jeu retiré', 'OK', { duration: 2000 });
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  toggleJeuRecu(jeuFestivalId: number, currentState: boolean) {
    this.reservationsService.marquerJeuRecu(this.reservationId(), jeuFestivalId, !currentState).subscribe({
      next: () => {
        // Mise à jour locale du signal au lieu de recharger tout
        const currentRes = this.reservation();
        if (currentRes) {
          const jeu = currentRes.jeux.find(j => j.id === jeuFestivalId);
          if (jeu) {
            jeu.jeu_recu = !currentState;
            this.reservation.set({...currentRes}); // Trigger signal update
          }
        }
        this.snackBar.open(!currentState ? 'Jeu marqué comme reçu' : 'Jeu marqué comme non reçu', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  // Facturation - Créer ou modifier la facture
  gererFacture() {
    const recap = this.recapFacture();
    if (!recap) return;

    this.generatingFacture.set(true);

    const payload = {
      reservation_id: recap.reservation_id,
      montant_tables: recap.montant_tables,
      montant_prises: recap.montant_prises,
      montant_brut: recap.montant_brut,
      montant_remise: recap.remise_montant + recap.remise_tables_montant,
      montant_total: recap.montant_total,
      lignes_facture: [
        {
          description: 'Tables réservées',
          quantite: 1,
          prix_unitaire: recap.montant_tables,
          montant_ligne: recap.montant_tables
        },
        {
          description: 'Prises électriques',
          quantite: 1,
          prix_unitaire: recap.montant_prises,
          montant_ligne: recap.montant_prises
        }
      ]
    };

    // Vérifier si facture existe déjà
    const facture = this.factureExistante();
    const call$ = facture 
      ? this.facturesService.modifierFacture(facture.id, payload)
      : this.facturesService.creerFacture(payload);

    call$.subscribe({
      next: (factureResponse: any) => {
        this.generatingFacture.set(false);
        this.factureExistante.set(factureResponse);
        const message = facture 
          ? `Facture ${factureResponse.numero_facture} modifiée`
          : `Facture ${factureResponse.numero_facture} générée`;
        this.snackBar.open(message, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.generatingFacture.set(false);
        const errorMsg = err.error?.error || 'Erreur lors de l\'opération';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        // En cas d'erreur, recharger la facture au cas où l'opération a partiellement réussi
        this.loadFacture();
      }
    });
  }

  updateEtatPaiement(nouvelEtat: string) {
    const facture = this.factureExistante();
    if (!facture) return;

    this.facturesService.updateStatutPaiement(facture.id, nouvelEtat as any).subscribe({
      next: () => {
        // Mise à jour locale du signal
        const currentFacture = this.factureExistante();
        if (currentFacture) {
          currentFacture.statut_paiement = nouvelEtat;
          this.factureExistante.set({...currentFacture});
        }
        this.snackBar.open('État de paiement mis à jour', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la mise à jour';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  // Supprimer la facture
  supprimerFacture() {
    const facture = this.factureExistante();
    if (!facture) return;

    // Vérifier que la facture n'est pas payée
    if (facture.statut_paiement === 'paye') {
      this.snackBar.open('Impossible de supprimer une facture payée', 'Fermer', { duration: 3000 });
      return;
    }

    // Demander confirmation
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la facture ${facture.numero_facture} ?`)) {
      return;
    }

    this.facturesService.supprimerFacture(facture.id).subscribe({
      next: () => {
        this.factureExistante.set(null);
        this.snackBar.open(`Facture ${facture.numero_facture} supprimée ✅`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        const errorMsg = err.error?.error || 'Erreur lors de la suppression';
        this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
      }
    });
  }

  private calculateMontantRemiseTables(): number {
    const res = this.reservation();
    if (!res || (res.remise_tables || 0) === 0) return 0;

    let totalMontantTables = 0;
    let totalTables = 0;
    
    (res.zones_reservees || []).forEach((zone: any) => {
      const nbTables = zone.nombre_tables || 0;
      const prixUnitaire = zone.prix_unitaire || 0;
      totalMontantTables += nbTables * prixUnitaire;
      totalTables += nbTables;
    });
    
    if (totalTables > 0) {
      const prixMoyenParTable = totalMontantTables / totalTables;
      return prixMoyenParTable * (res.remise_tables || 0);
    }
    
    return 0;
  }

  // Helpers
  getTablesRestantes(): number {
    const res = this.reservation();
    if (!res) return 0;
    const reservees = parseInt(String(res.nb_tables_reservees || 0), 10);
    const utilisees = res.jeux.reduce((sum, j) => sum + (parseFloat(String(j.tables_allouees || 0))), 0);
    return Math.max(0, reservees - utilisees);
  }

  getEtatContactLabel(etat: string): string {
    return ReservationsService.getEtatContactLabel(etat as any);
  }

  getEtatContactColor(etat: string): string {
    return ReservationsService.getEtatContactColor(etat as any);
  }

  getEtatPresenceLabel(etat: string): string {
    return ReservationsService.getEtatPresenceLabel(etat as any);
  }

  getEtatPresenceColor(etat: string): string {
    return ReservationsService.getEtatPresenceColor(etat as any);
  }

  // Liste des états disponibles
  etatsContact = [
    { value: 'pas_contacte', label: 'Pas contacté' },
    { value: 'contacte', label: 'Contacté' },
    { value: 'en_discussion', label: 'En discussion' },
    { value: 'reserve', label: 'Réservé' },
    { value: 'liste_jeux_demandee', label: 'Liste jeux demandée' },
    { value: 'liste_jeux_obtenue', label: 'Liste jeux obtenue' },
    { value: 'jeux_recus', label: 'Jeux reçus' }
  ];

  etatsPresence = [
    { value: 'non_defini', label: 'Non défini' },
    { value: 'present', label: 'Présent' },
    { value: 'considere_absent', label: 'Considéré absent' },
    { value: 'absent', label: 'Absent' }
  ];

  etatsPaiement = [
    { value: 'non_paye', label: 'Non payé' },
    { value: 'partiel', label: 'Partiellement payé' },
    { value: 'paye', label: 'Payé' }
  ];

  getEtatPaiementLabel(etat: string): string {
    const paiement = this.etatsPaiement.find(e => e.value === etat);
    return paiement?.label || etat;
  }

  getEtatPaiementColor(etat: string): string {
    switch (etat) {
      case 'non_paye':
        return '#d32f2f';
      case 'partiel':
        return '#f57c00';
      case 'paye':
        return '#388e3c';
      default:
        return '#666';
    }
  }
  onEtatPaiementChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.updateEtatPaiement(value);
  }}