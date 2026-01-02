import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { ZonePlanDto, JeuFestivalDto } from '../../types/zone-plan-dto';
import { ZonesPlanService } from '../zones-plan-service';
import { ZonePlanCard } from '../zone-plan-card/zone-plan-card';
import { ZonePlanFormDialog } from '../zone-plan-form-dialog/zone-plan-form-dialog';
import { PermissionsService } from '../../services/permissions-service';
import { FestivalsService } from '../../shared/festivals-service';
import { FestivalsDto } from '../../types/festivals-dto';
import { PlacementJeuDialog } from '../placement-jeu-dialog/placement-jeu-dialog';

@Component({
  selector: 'app-zones-plan-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTabsModule,
    MatCardModule,
    ZonePlanCard,
    PlacementJeuDialog,
    RouterLink
  ],
  templateUrl: './zones-plan-list.html',
  styleUrl: './zones-plan-list.css',
})
export class ZonesPlanList {
  private route = inject(ActivatedRoute);
  private zonesPlanService = inject(ZonesPlanService);
  private festivalsService = inject(FestivalsService);
  private permissions = inject(PermissionsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  festivalId = signal<number>(0);
  festival = signal<FestivalsDto | null>(null);
  zones = signal<ZonePlanDto[]>([]);
  jeuxNonPlaces = signal<JeuFestivalDto[]>([]);
  tousLesJeux = signal<JeuFestivalDto[]>([]);
  loading = signal(false);

  readonly canCreate = this.permissions.can('zonesPlan', 'create');
  readonly canModify = this.permissions.can('zonesPlan', 'update');
  readonly canDelete = this.permissions.can('zonesPlan', 'delete');
  readonly canPlace = this.permissions.can('jeux', 'place');
  readonly canView = this.permissions.can('zonesPlan', 'view');

  //stat pour l'ensemble des zones
  totalTablesUtilisees = computed(() => 
    this.zones().reduce((sum, z) => sum + (Number(z.tables_utilisees) || 0), 0)
  );
  totalTablesDisponibles = computed(() => 
    this.zones().reduce((sum, z) => sum + Number(z.nombre_tables_total), 0)
  );
  totalJeuxPlaces = computed(() => 
    this.zones().reduce((sum, z) => sum + (Number(z.nb_jeux_places) || 0), 0)
  );
  tauxOccupation = computed(() => {
    const total = this.totalTablesDisponibles();
    if (total === 0) return 0;
    return Math.round((this.totalTablesUtilisees() / total) * 100);
  });
  tablesLibres = computed(() => 
    this.totalTablesDisponibles() - this.totalTablesUtilisees()
  );

  // Calculer l'utilisation réelle de chaque type de table (ce qui est placé dans les zones)
  utilisationTablesStandard = computed(() => {
    return this.tousLesJeux()
      .filter(j => j.est_place)
      .reduce((sum, j) => sum + (Number(j.nb_tables_std) || 0), 0);
  });

  utilisationTablesGrandes = computed(() => {
    return this.tousLesJeux()
      .filter(j => j.est_place)
      .reduce((sum, j) => sum + (Number(j.nb_tables_gde) || 0), 0);
  });

  utilisationTablesMairie = computed(() => {
    return this.tousLesJeux()
      .filter(j => j.est_place)
      .reduce((sum, j) => sum + (Number(j.nb_tables_mairie) || 0), 0);
  });

  // Regrouper les jeux non placés par réservation
  jeuxNonPlacesParReservation = computed(() => {
    const jeux = this.jeuxNonPlaces();
    const grouped = new Map<number, { reservationId: number; jeux: JeuFestivalDto[] }>();
    
    jeux.forEach(jeu => {
      if (!grouped.has(jeu.reservation_id)) {
        grouped.set(jeu.reservation_id, { reservationId: jeu.reservation_id, jeux: [] });
      }
      grouped.get(jeu.reservation_id)!.jeux.push(jeu);
    });
    
    return Array.from(grouped.values()).sort((a, b) => a.reservationId - b.reservationId);
  });

  constructor() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.festivalId.set(id);
        this.loadData();
      }
    });
  }

  private loadData() {
    this.loading.set(true);
    
    // Charger festival
    this.festivalsService.getFestivalById(this.festivalId()).subscribe({
      next: (fest) => this.festival.set(fest),
      error: (err) => console.error('Erreur festival:', err)
    });

    // Charger zones plan
    this.loadZones();

    // Charger tous les jeux (placés + non placés)
    this.loadTousLesJeux();

    // Charger jeux non placés
    this.loadJeuxNonPlaces();
  }

  private loadZones() {
    this.zonesPlanService.getByFestival(this.festivalId()).subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur zones:', err);
        this.zones.set([]);
        this.loading.set(false);
      }
    });
  }

  private loadJeuxNonPlaces() {
    this.zonesPlanService.getJeuxNonPlaces(this.festivalId()).subscribe({
      next: (jeux) => this.jeuxNonPlaces.set(jeux),
      error: (err) => console.error('Erreur jeux non placés:', err)
    });
  }

  private loadTousLesJeux() {
    this.zonesPlanService.getByFestival(this.festivalId()).subscribe({
      next: (zones) => {
        // Charger les jeux placés de chaque zone
        let tousLesJeux: JeuFestivalDto[] = [];
        zones.forEach(zone => {
          this.zonesPlanService.getJeuxByZone(zone.id).subscribe({
            next: (jeux) => {
              tousLesJeux = [...tousLesJeux, ...jeux];
              this.tousLesJeux.set([...this.jeuxNonPlaces(), ...tousLesJeux]);
            },
            error: (err) => console.error('Erreur jeux zone:', err)
          });
        });
      },
      error: (err) => console.error('Erreur zones:', err)
    });
  }

  createZone() {
    const dialogRef = this.dialog.open(ZonePlanFormDialog, {
      width: '500px',
      disableClose: true,
      data: { festivalId: this.festivalId() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'create') {
        this.zonesPlanService.create(this.festivalId(), result.data).subscribe({
          next: () => {
            this.snackBar.open('Zone du plan créée', 'OK', { duration: 2000 });
            this.loadZones();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de la création';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  onEdit(zone: ZonePlanDto) {
    const dialogRef = this.dialog.open(ZonePlanFormDialog, {
      width: '500px',
      disableClose: true,
      data: { festivalId: this.festivalId(), zone }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit') {
        this.zonesPlanService.update(result.zoneId, result.data).subscribe({
          next: () => {
            this.snackBar.open('Zone du plan modifiée', 'OK', { duration: 2000 });
            this.loadZones();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors de la modification';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  onDelete(zoneId: number) {
    if (confirm('⚠️ Supprimer cette zone ?\n\nCette action est irréversible si des jeux sont placés.')) {
      this.zonesPlanService.delete(zoneId).subscribe({
        next: () => {
          this.snackBar.open('Zone supprimée', 'OK', { duration: 2000 });
          this.loadZones();
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur lors de la suppression';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // placer depuis zone 
  onPlacerJeu(zone: ZonePlanDto) {
    const dialogRef = this.dialog.open(PlacementJeuDialog, {
      width: '600px',
      disableClose: true,
      data: {
        zone: zone,
        jeuxDisponibles: this.jeuxNonPlaces()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.zonesPlanService.placerJeu(
          result.jeu_festival_id,
          result.zone_plan_id,
          {
            nb_tables_std: result.nb_tables_std,
            nb_tables_gde: result.nb_tables_gde,
            nb_tables_mairie: result.nb_tables_mairie
          }
        ).subscribe({
          next: () => {
            this.snackBar.open('Jeu placé avec succès !', 'OK', { duration: 2000 });
            this.loadZones();
            this.loadJeuxNonPlaces();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors du placement';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  // placer depuis l'onglet "Jeux non placés"
  onPlacerJeuDepuisListe(jeu: JeuFestivalDto) {
    const dialogRef = this.dialog.open(PlacementJeuDialog, {
      width: '600px',
      disableClose: true,
      data: {
        jeu: jeu,
        zonesDisponibles: this.zones()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.zonesPlanService.placerJeu(
          result.jeu_festival_id,
          result.zone_plan_id,
          {
            nb_tables_std: result.nb_tables_std,
            nb_tables_gde: result.nb_tables_gde,
            nb_tables_mairie: result.nb_tables_mairie
          }
        ).subscribe({
          next: () => {
            this.snackBar.open('Jeu placé avec succès !', 'OK', { duration: 2000 });
            this.loadZones();
            this.loadJeuxNonPlaces();
            this.loadTousLesJeux();
          },
          error: (err) => {
            const errorMsg = err.error?.error || 'Erreur lors du placement';
            this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
          } 
        });
      }
    });
  }

  // Calculer les tables allouées par une réservation (jeux non placés)
  getTablesAllouesByReservation(jeux: JeuFestivalDto[]): number {
    return jeux.reduce((sum, j) => sum + Number(j.tables_allouees), 0);
  }

  onRetirerJeu(jeuFestivalId: number) {
    if (confirm('Retirer ce jeu de la zone ?')) {
      this.zonesPlanService.retirerJeu(jeuFestivalId).subscribe({
        next: () => {
          this.snackBar.open('Jeu retiré', 'OK', { duration: 2000 });
          this.loadZones();
          this.loadJeuxNonPlaces();
          this.loadTousLesJeux();
        },
        error: (err) => {
          const errorMsg = err.error?.error || 'Erreur';
          this.snackBar.open(errorMsg, 'Fermer', { duration: 3000 });
        }
      });
    }
  }

}
