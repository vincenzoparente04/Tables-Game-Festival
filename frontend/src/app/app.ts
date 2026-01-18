import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './shared/auth/auth-service';
import { PermissionsService } from './services/permissions-service';
import { FestivalsService } from './shared/festivals-service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { FestivalsDto } from './types/festivals-dto';



@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatToolbarModule,
    MatMenuModule,
    MatSidenavModule,
    MatDividerModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  private auth = inject(AuthService);
  private router = inject(Router);
  private permissions = inject(PermissionsService);


  isLoggedIn = this.auth.isLoggedIn;
  isAdmin = this.auth.isAdmin;

  
  logoutApp(){
    this.auth.logout();
    this.router.navigate(['/home']);
  } 

  
  
  canViewFestivals = this.permissions.can('festivals', 'viewAll');
  canViewCurrent = this.permissions.can('festivals', 'viewCurrent');
  canAccessAdmin = this.permissions.isAdmin;
  isPendingUser = this.permissions.isPendingUser;
  isOrganisateur = this.permissions.isAdminOrSuperOrgaOrOrga;
  canViewgames = this.permissions.can('jeux', 'viewAll');
  canviewEditeurs = this.permissions.can('editeurs', 'viewAll');
  canViewReservants = this.permissions.can('reservants', 'view');
}
