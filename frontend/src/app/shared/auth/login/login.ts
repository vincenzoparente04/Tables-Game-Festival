import { Component, effect, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth-service';
import { ReactiveFormsModule, FormGroup, FormControl, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Register } from "../register/register";
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, Register],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  showRegister = signal(false);

  LoginForm = new FormGroup({
    login: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    password: new FormControl('', {nonNullable: true, validators: [Validators.required]})
  });

  constructor() {
    // Réinitialiser à la vue login quand on navigue vers cette route
    effect(() => {
      this.route.url;
      this.showRegister.set(false);
    });

    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.router.navigate(['/home']);
      }
    });
  }

  displayRegister() {
    this.showRegister.set(true);
  }

  displayLogin() {
    this.showRegister.set(false);
  }

  onSubmit() {
    if (this.LoginForm.invalid) return;
    this.auth.login(
      this.LoginForm.value.login!,
      this.LoginForm.value.password!
    );
  }

  get loading() { return this.auth.isLoading(); }
  get error() { return this.auth.error(); }
}