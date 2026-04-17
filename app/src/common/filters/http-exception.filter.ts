import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract message from exception
    let message: string;
    let errorDetails: any = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || 'An error occurred';
      errorDetails = (exceptionResponse as any);
    } else {
      message = 'An error occurred';
    }

    // Log the error
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} - ${message}`, exception.stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${message}`);
    }

    // Build error response
    const errorResponse = {
      success: false,
      message: this.sanitizeMessage(message, status),
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // For validation errors, include details
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      errorResponse['errors'] = message;
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeMessage(message: string | string[], status: number): string {
    // Convert array of messages to string
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    // Map specific error messages to user-friendly versions
    const messageMap: { [key: string]: string } = {
      'Invalid credentials': 'Invalid username or password',
      'Unauthorized': 'Authentication required',
      'Forbidden': 'Access denied',
      'Not Found': 'Resource not found',
      'Conflict': 'Resource already exists',
    };

    // Try to match and sanitize known error messages
    for (const [key, value] of Object.entries(messageMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    // For server errors, return generic message
    if (status >= 500) {
      return 'An internal server error occurred';
    }

    return message;
  }
}
