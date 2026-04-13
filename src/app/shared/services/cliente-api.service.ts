// src/app/shared/services/cliente-api.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import {
  ApiResponse,
  Cliente,
  DatosGenericos,
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

  // ✅ Ahora retorna ServiciosResponse con el campo "servicios"
  getServicios(codigoCuenta: string): Observable<ServiciosResponse> {
    return this.http
      .get<ServiciosResponse>(
        `${this.baseUrl}/cliente/${codigoCuenta}/servicios`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getAtenciones(codigoCuenta: string): Observable<ApiResponse<DatosGenericos[]>> {
    return this.http
      .get<ApiResponse<DatosGenericos[]>>(
        `${this.baseUrl}/cliente/${codigoCuenta}/atenciones`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getFacturas(codigoCuenta: string): Observable<ApiResponse<DatosGenericos[]>> {
    return this.http
      .get<ApiResponse<DatosGenericos[]>>(
        `${this.baseUrl}/cliente/${codigoCuenta}/facturas`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }

  getFacturaDetalle(id: string): Observable<ApiResponse<DatosGenericos>> {
    return this.http
      .get<ApiResponse<DatosGenericos>>(
        `${this.baseUrl}/factura/${id}`,
        { headers: this.headers }
      )
      .pipe(catchError((e) => this.handleError(e)));
  }
}