export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Envelope padrão de sucesso (padroes-backend: success/data/meta). */
export class ApiResponseHelper {
  static ok<T>(data: T, meta?: PaginationMeta): ApiSuccess<T> {
    return meta ? { success: true, data, meta } : { success: true, data };
  }

  static paginate<T>(items: T[], page: number, pageSize: number): ApiSuccess<T[]> {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    return ApiResponseHelper.ok(items.slice(start, start + pageSize), { page, pageSize, totalItems, totalPages });
  }
}
