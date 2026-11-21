import { HttpException, HttpStatus } from '@nestjs/common';

/** Erro de negócio com código legível por máquina ({DOMINIO}_{PROBLEMA}) no envelope de erro. */
export class BusinessException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    readonly details: Array<{ field?: string; message: string }> = [],
  ) {
    super({ code, message, details }, status);
  }
}
