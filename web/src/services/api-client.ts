import axios, { AxiosError } from 'axios';
import { config } from '../config';
import type { PaginationMeta } from '../types/api';

/** Erro da API já traduzido do envelope { success:false, error:{ code, message, details } }. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: Array<{ field?: string; message: string }> = [],
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: { code: string; message: string; details?: Array<{ field?: string; message: string }> };
}

export const httpClient = axios.create({ baseURL: config.apiBaseUrl, timeout: 30_000 });

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Envelope<unknown>>) => {
    const body = error.response?.data;
    if (body?.error) {
      return Promise.reject(new ApiError(body.error.code, body.error.message, error.response?.status ?? 0, body.error.details ?? []));
    }
    const offline = !error.response;
    return Promise.reject(
      new ApiError(offline ? 'API_UNREACHABLE' : 'REQUEST_FAILED', offline ? 'A API não respondeu. Ela está rodando?' : error.message, error.response?.status ?? 0),
    );
  },
);

/** Devolve só o `data` do envelope. */
export async function unwrap<T>(request: Promise<{ data: Envelope<T> }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

/** Para listas paginadas: devolve `data` e `meta`. */
export async function unwrapPage<T>(request: Promise<{ data: Envelope<T[]> }>): Promise<{ items: T[]; meta: PaginationMeta }> {
  const response = await request;
  return { items: response.data.data, meta: response.data.meta as PaginationMeta };
}
