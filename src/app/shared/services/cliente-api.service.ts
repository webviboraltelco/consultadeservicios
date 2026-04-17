// src/app/shared/services/cliente-api.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import {
  ApiResponse,
  AtencionesResponse,
  Cliente,
  DatosGenericos,
  Factura,
  FacturaDetalle,
  ServiciosResponse,
} from '../models/cliente.models';

@Injectable({ providedIn: 'root' })
export class ClienteApiService {
  private readonly baseUrl = `${environment.API_URL}/api/v1`;
  private readonly http = inject(HttpClient);

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      accept: 'application/json',
      Authorization: environment.API_KEY,
    });
  }

  private handleError(err: any): Observable<never> {
    const msg =
      err?.error?.mensaje ??
      err?.error?.message ??
      err?.message ??
      'Error al conectar con el servidor';
    return throwError(() => new Error(msg));
  }

  getCliente(cedula: string): Observable<ApiResponse<Cliente | Cliente[]>> {
    return this.http
      .get<ApiResponse<Cliente | Cliente[]>>(
        `${this.baseUrl}/cliente/${cedula}`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getServicios(codigoCuenta: string): Observable<ServiciosResponse> {
    return this.http
      .get<ServiciosResponse>(
        `${this.baseUrl}/cliente/${codigoCuenta}/servicios`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getAtenciones(codigoCuenta: string): Observable<AtencionesResponse> {
    return this.http
      .get<AtencionesResponse>(
        `${this.baseUrl}/cliente/${codigoCuenta}/atenciones`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getFacturas(codigoCuenta: string): Observable<ApiResponse<Factura[]>> {
    return this.http
      .get<ApiResponse<Factura[]>>(
        `${this.baseUrl}/cliente/${codigoCuenta}/facturas`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getFacturaDetalle(id: string): Observable<ApiResponse<FacturaDetalle>> {
    return this.http
      .get<ApiResponse<FacturaDetalle>>(
        `${this.baseUrl}/factura/${id}`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  // El endpoint /factura/:id devuelve PDF directo, no JSON
descargarFacturaPdf(idFactura: string): Observable<Blob> {
  return this.http
    .get(`${this.baseUrl}/factura/${idFactura}`, {
      headers: this.headers,
      responseType: 'blob',
    })
    .pipe(catchError((e) => this.handleError(e)));
  }
}