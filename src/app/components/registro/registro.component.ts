// src/app/components/registro/registro.component.ts
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteApiService } from '../../shared/services/cliente-api.service';
import { Cliente } from '../../shared/models/cliente.models';

// Validador: contraseñas deben coincidir
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password')?.value;
  const pw2 = control.get('confirmar')?.value;
  return pw && pw2 && pw !== pw2 ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  private readonly api = inject(ClienteApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // ─── Estado del wizard ──────────────────────────────────
  paso = signal<1 | 2 | 3>(1);
  cargando = signal(false);
  error = signal('');
  clienteValido = signal<Cliente | null>(null);
  mostrarPw = signal(false);
  mostrarPw2 = signal(false);

  // ─── Paso 1: validar cédula ──────────────────────────────
  paso1 = this.fb.group({
    cedula: ['', [Validators.required, Validators.minLength(5), Validators.pattern(/^\d+$/)]],
  });

  // ─── Paso 2: datos del usuario ──────────────────────────
  paso2 = this.fb.group({
    nombres: ['', [Validators.required, Validators.minLength(3)]],
    cedula: [{ value: '', disabled: true }],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    usuario: ['', [Validators.required, Validators.minLength(4), Validators.pattern(/^[a-zA-Z0-9._]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmar: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  // ─── Getters para validación en template ────────────────
  get f1() { return this.paso1.controls; }
  get f2() { return this.paso2.controls; }
  get pwNoCoinciden(): boolean {
    return this.paso2.hasError('noCoinciden') && !!this.f2['confirmar'].touched;
  }

  // ─── Paso 1: validar que el cliente existe ───────────────
  validarCliente(): void {
    if (this.paso1.invalid) {
      this.paso1.markAllAsTouched();
      return;
    }

    const cedula = this.paso1.value.cedula!.trim();
    this.cargando.set(true);
    this.error.set('');

    this.api.getCliente(cedula).subscribe({
      next: (res) => {
        const lista = Array.isArray(res.resultado)
          ? res.resultado
          : res.resultado ? [res.resultado] : [];

        if (lista.length === 0) {
          this.error.set('No encontramos ningún cliente registrado con esta cédula. Comunícate con nosotros.');
          this.cargando.set(false);
          return;
        }

        const cliente = lista[0] as Cliente;
        this.clienteValido.set(cliente);

        // Pre-llenar datos conocidos

        this.paso2.patchValue({
          nombres: cliente.nombres ?? '',
          cedula: cedula,
          direccion: cliente.direccion ?? '',
        });

        // ✅ Deshabilita después de llenar
        this.paso2.get('nombres')?.disable();
        this.paso2.get('direccion')?.disable();

        this.cargando.set(false);
        this.paso.set(2);

      },
      error: (err: Error) => {
        this.error.set(err.message ?? 'Error al validar la cédula. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  // ─── Paso 2: registrar usuario ───────────────────────────
  registrar(): void {
    if (this.paso2.invalid) {
      this.paso2.markAllAsTouched();
      return;
    }

    const datos = {
      cedula: this.paso1.value.cedula,
      nombres: this.f2['nombres'].value,
      email: this.f2['email'].value,
      telefono: this.f2['telefono'].value,
      direccion: this.f2['direccion'].value,
      usuario: this.f2['usuario'].value,
      password: this.f2['password'].value,
    };

    this.cargando.set(true);
    this.error.set('');

    // Fase 2: this.api.registrarUsuario(datos).subscribe(...)
    // Por ahora simulamos éxito
    setTimeout(() => {
      console.log('📋 Datos a registrar:', datos);
      this.cargando.set(false);
      this.paso.set(3);
    }, 1500);
  }

  // ─── Navegación ──────────────────────────────────────────
  volverPaso1(): void {
    this.paso.set(1);
    this.error.set('');
    this.clienteValido.set(null);
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

  togglePw(): void { this.mostrarPw.update(v => !v); }
  togglePw2(): void { this.mostrarPw2.update(v => !v); }

  get pwStrength(): { nivel: string; color: string; ancho: string } {
    const pw = this.f2['password'].value ?? '';
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    if (score <= 1) return { nivel: 'Débil', color: '#ef4444', ancho: '25%' };
    if (score === 2) return { nivel: 'Regular', color: '#f59e0b', ancho: '50%' };
    if (score === 3) return { nivel: 'Buena', color: '#3b82f6', ancho: '75%' };
    return { nivel: 'Fuerte', color: '#22c55e', ancho: '100%' };
  }
}