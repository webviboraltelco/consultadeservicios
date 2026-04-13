// src/app/shared/models/cliente.models.ts

export interface ApiResponse<T> {
  codigo: string;
  mensaje: string;
  resultado: T;
}

// ✅ Respuesta específica del endpoint de servicios
export interface ServiciosResponse {
  codigo: string;
  mensaje: string;
  servicios: Servicio[];
}

export interface Servicio {
  idServicio: number;
  NombreServicio: string;
  PrecioTarifa: number;
  Tarifa: string;
  Estado: string;
}

export interface Cliente {
  codigo: string;
  nombres: string;
  direccion: string;
  documento_identidad: string;
  estado: string;
  deuda_total: number;
}

export type DatosGenericos = Record<string, any>;
export type ActiveTab = 'servicios' | 'atenciones' | 'facturas';