// src/app/app.ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClienteApiService } from './shared/services/cliente-api.service';
import { Cliente } from './shared/models/cliente.models';
import { DashboardComponent } from './components/dashboard/dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReactiveFormsModule, DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ClienteApiService);

  searchForm = this.fb.group({
    cedula: ['', Validators.required],
  });

  // ✅ Ahora guarda TODOS los registros del cliente, no solo el primero
  clientes = signal<Cliente[]>([]);
  searchedCedula = signal('');
  isSearching = signal(false);
  searchError = signal<string | null>(null);

  buscarCliente(): void {
    if (this.searchForm.invalid) return;

    const cedula = this.searchForm.value.cedula!.trim();
    this.isSearching.set(true);
    this.searchError.set(null);
    this.clientes.set([]);

    this.api.getCliente(cedula).subscribe({
      next: (res) => {
        // Normaliza: siempre convierte a array
        const lista = Array.isArray(res.resultado)
          ? (res.resultado as Cliente[]).filter(Boolean)
          : res.resultado
          ? [res.resultado as Cliente]
          : [];

        if (lista.length > 0) {
          this.clientes.set(lista);
          this.searchedCedula.set(cedula);
        } else {
          this.searchError.set('No se encontró ningún cliente con ese documento.');
        }
        this.isSearching.set(false);
      },
      error: (err: Error) => {
        this.searchError.set(err.message);
        this.isSearching.set(false);
      },
    });
  }
}