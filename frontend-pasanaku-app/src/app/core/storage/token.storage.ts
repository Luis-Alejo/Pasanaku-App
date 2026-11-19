import { Injectable } from '@angular/core';

const TOKEN_KEY = 'pk-token';

/**
 * Guarda el token de sesión en el dispositivo. Nunca guarda claves de Stellar:
 * las custodia el backend. Si el almacenamiento falla, la sesión dura hasta cerrar la app.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private memory: string | null = null;

  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? this.memory;
    } catch {
      return this.memory;
    }
  }

  set(token: string): void {
    this.memory = token;
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Queda solo en memoria.
    }
  }

  clear(): void {
    this.memory = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nada que borrar.
    }
  }
}
