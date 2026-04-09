// src/app/components/dashboard/dashboard.ts
import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ClienteApiService } from '../../shared/services/cliente-api.service';
import {
  ActiveTab,
  Cliente,
  DatosGenericos,
} from '../../shared/models/cliente.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ClienteApiService);

  // ✅ Recibe todas las cuentas del cliente
  clientes = input.required<Cliente[]>();
  cedula = input.required<string>();

  // Cuenta actualmente seleccionada (por defecto la primera)
  cuentaSeleccionada = signal<Cliente | null>(null);

  // Tabs de información
  activeTab = signal<ActiveTab>('servicios');

  servicios = signal<DatosGenericos[]>([]);
  atenciones = signal<DatosGenericos[]>([]);
  facturas = signal<DatosGenericos[]>([]);
  facturaDetalle = signal<DatosGenericos | null>(null);

  loadingServicios = signal(false);
  loadingAtenciones = signal(false);
  loadingFacturas = signal(false);
  loadingDetalle = signal(false);

  errorServicios = signal<string | null>(null);
  errorAtenciones = signal<string | null>(null);
  errorFacturas = signal<string | null>(null);
  errorDetalle = signal<string | null>(null);

  private serviciosLoaded = false;
  private atencionesLoaded = false;
  private facturasLoaded = false;

  readonly tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'servicios', label: 'Servicios', icon: '📡' },
    { id: 'atenciones', label: 'Atenciones', icon: '🛠️' },
    { id: 'facturas', label: 'Facturas', icon: '🧾' },
  ];

  // Cliente principal (primer registro) para mostrar nombre y documento
  clientePrincipal = computed(() => this.clientes()[0] ?? null);

  // Deuda total sumada de todas las cuentas
  deudaTotal = computed(() =>
    this.clientes().reduce((sum, c) => sum + (c.deuda_total ?? 0), 0)
  );

  // Estado: ACTIVO si al menos una cuenta está activa
  estadoGeneral = computed(() =>
    this.clientes().some((c) => c.estado === 'ACTIVO') ? 'ACTIVO' : 'INACTIVO'
  );

  serviciosColumns = computed(() =>
    this.servicios().length > 0 ? Object.keys(this.servicios()[0]) : []
  );
  atencionesColumns = computed(() =>
    this.atenciones().length > 0 ? Object.keys(this.atenciones()[0]) : []
  );
  facturasColumns = computed(() =>
    this.facturas().length > 0 ? Object.keys(this.facturas()[0]) : []
  );

  facturaDetalleEntries = computed(() => {
    const d = this.facturaDetalle();
    if (!d) return [];
    return Object.entries(d).filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
    );
  });

  ngOnInit(): void {
    this.cuentaSeleccionada.set(this.clientes()[0]);
    this.cargarServicios();
  }

  // Selecciona una cuenta para verla en detalle
  seleccionarCuenta(cuenta: Cliente): void {
    this.cuentaSeleccionada.set(cuenta);
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);
    if (tab === 'atenciones' && !this.atencionesLoaded) this.cargarAtenciones();
    if (tab === 'facturas' && !this.facturasLoaded) this.cargarFacturas();
  }

  verDetalle(factura: DatosGenericos): void {
    const id =
      factura['codigo'] ??
      factura['id'] ??
      factura['numero_factura'] ??
      factura['numero'];

    if (!id) {
      this.errorDetalle.set('No se pudo obtener el ID de esta factura.');
      return;
    }

    this.loadingDetalle.set(true);
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);

    this.api.getFacturaDetalle(String(id)).subscribe({
      next: (res) => {
        const data = Array.isArray(res.resultado)
          ? res.resultado[0]
          : res.resultado;
        this.facturaDetalle.set(data);
        this.loadingDetalle.set(false);
      },
      error: (err: Error) => {
        this.errorDetalle.set(err.message);
        this.loadingDetalle.set(false);
      },
    });
  }

  cerrarDetalle(): void {
    this.facturaDetalle.set(null);
    this.errorDetalle.set(null);
  }

  private cargarServicios(): void {
    if (this.serviciosLoaded) return;
    this.loadingServicios.set(true);
    this.api.getServicios(this.cedula()).subscribe({
      next: (res) => {
        this.servicios.set(this.toArray(res.resultado));
        this.serviciosLoaded = true;
        this.loadingServicios.set(false);
      },
      error: (err: Error) => {
        this.errorServicios.set(err.message);
        this.loadingServicios.set(false);
      },
    });
  }

  private cargarAtenciones(): void {
    if (this.atencionesLoaded) return;
    this.loadingAtenciones.set(true);
    this.api.getAtenciones(this.cedula()).subscribe({
      next: (res) => {
        this.atenciones.set(this.toArray(res.resultado));
        this.atencionesLoaded = true;
        this.loadingAtenciones.set(false);
      },
      error: (err: Error) => {
        this.errorAtenciones.set(err.message);
        this.loadingAtenciones.set(false);
      },
    });
  }

  private cargarFacturas(): void {
    if (this.facturasLoaded) return;
    this.loadingFacturas.set(true);
    this.api.getFacturas(this.cedula()).subscribe({
      next: (res) => {
        this.facturas.set(this.toArray(res.resultado));
        this.facturasLoaded = true;
        this.loadingFacturas.set(false);
      },
      error: (err: Error) => {
        this.errorFacturas.set(err.message);
        this.loadingFacturas.set(false);
      },
    });
  }

  private toArray(resultado: any): DatosGenericos[] {
    if (!resultado) return [];
    if (Array.isArray(resultado)) return resultado.filter(Boolean);
    return [resultado];
  }

  formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return '—'; }
    }
    return String(value);
  }
}