import { Module } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

@Module({
  exports: [HttpExceptionFilter, RequestLoggerMiddleware],
  providers: [HttpExceptionFilter, RequestLoggerMiddleware],
})
export class CommonModule {}
