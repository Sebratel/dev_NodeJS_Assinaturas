import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception.js';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'REQUEST_INVALID',
  401: 'AUTH_REQUIRED',
  403: 'AUTH_FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'RESOURCE_CONFLICT',
  422: 'REQUEST_UNPROCESSABLE',
};

/** Converte qualquer erro no envelope { success:false, error:{ code, message, details } }. 500 nunca expõe detalhe. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof BusinessException) {
      response.status(exception.getStatus()).json({
        success: false,
        error: { code: exception.code, message: exception.message, details: exception.details },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const rawMessage = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : body;
      const messages = Array.isArray(rawMessage) ? rawMessage.map(String) : [String(rawMessage ?? exception.message)];
      response.status(status).json({
        success: false,
        error: {
          code: CODE_BY_STATUS[status] ?? 'REQUEST_FAILED',
          message: messages[0],
          details: messages.length > 1 ? messages.map((message) => ({ message })) : [],
        },
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente de novo; se continuar, avise a TI.', details: [] },
    });
  }
}
