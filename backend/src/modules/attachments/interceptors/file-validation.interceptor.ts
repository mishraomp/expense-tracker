import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ATTACHMENT_MAX_SIZE_BYTES, MIME_WHITELIST } from '../attachment.constants';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const file = req.file;
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
      throw new BadRequestException('File exceeds size limit');
    }
    if (!MIME_WHITELIST.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    return next.handle();
  }
}
