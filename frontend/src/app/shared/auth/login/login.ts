import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { ReactiveFormsModule, FormGroup, FormControl, Validators} from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  LoginForm = new FormGroup({
    login: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    password: new FormControl('', {nonNullable: true, validators: [Validators.required]})
  });
  
  constructor() {

    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.router.navigate(['/home']);
      }
    });
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