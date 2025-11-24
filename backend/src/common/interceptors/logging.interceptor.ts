import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

interface StructuredLogFields {
  method: string;
  url: string;
  userAgent: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  requestId?: string;
  userId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = request.get('x-request-id') || this.generateRequestId();
    const startTime = Date.now();

    // Extract userId from JWT if available (assumes req.user set by auth guard)
    const userId = request.user?.sub || request.user?.id || 'anonymous';

    const baseFields: StructuredLogFields = {
      method,
      url,
      userAgent,
      requestId,
      userId,
    };

    this.logger.log(
      `➡️  ${method} ${url}`,
      JSON.stringify({
        ...baseFields,
        phase: 'request',
        body: this.sanitizeBody(body),
      }),
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;
          if (statusCode > 304) {
            this.logger.warn(
              `⬅️  ${method} ${url} ${statusCode} - ${duration}ms`,
              JSON.stringify({
                ...baseFields,
                phase: 'response',
                statusCode,
                duration,
                success: true,
              }),
            );
            return;
          }
          this.logger.log(
            `⬅️  ${method} ${url} ${statusCode} - ${duration}ms`,
            JSON.stringify({
              ...baseFields,
              phase: 'response',
              statusCode,
              duration,
              success: true,
            }),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `❌ ${method} ${url} ${statusCode} - ${duration}ms - ${error.message}`,
            JSON.stringify({
              ...baseFields,
              phase: 'error',
              statusCode,
              duration,
              error: error.message,
              stack: error.stack,
              success: false,
            }),
          );
        },
      }),
    );
  }

  /**
   * Generates a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sanitizes request body to remove sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'refreshToken', 'accessToken'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
