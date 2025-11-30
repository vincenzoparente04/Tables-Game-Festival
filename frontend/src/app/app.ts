import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './shared/auth/auth-service';
import { PermissionsService } from './services/permissions-service'
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatCardModule, MatButtonModule, MatIconModule, MatToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  private auth = inject(AuthService);
  private router = inject(Router);

  isLoggedIn = this.auth.isLoggedIn;
  isAdmin = this.auth.isAdmin;
  
  logoutApp(){
    this.auth.logout();
    this.router.navigate(['/home']);
  } 

  private permissions = inject(PermissionsService);
  
  canViewFestivals = this.permissions.can('festivals', 'viewAll');
  canViewCurrent = this.permissions.can('festivals', 'viewCurrent')
  canAccessAdmin = this.permissions.isAdmin;
  isPendingUser = this.permissions.isPendingUser;
  isOrganisateur = this.permissions.isAdminOrSuperOrgaOrOrga;
}
