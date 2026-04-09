// src/app/shared/models/cliente.models.ts

export interface ApiResponse<T> {
  codigo: string;
  mensaje: string;
  resultado: T;
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