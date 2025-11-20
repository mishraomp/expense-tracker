import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { ImportSessionResponseDto } from './dto/import-session-response.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'import' })
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Invalid file type. Only CSV and Excel files are allowed.'),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ImportSessionResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Get userId from Keycloak JWT
    const userId = req.user.sub; // from KeycloakAuthGuard
    const fileType = extname(file.originalname).toLowerCase() === '.csv' ? 'csv' : 'xlsx';

    // Create session
    const session = await this.importService.createSession(userId, file.originalname, fileType);

    // Parse file based on type
    let rows;
    try {
      if (fileType === 'csv') {
        rows = await this.importService.parseCSV(
          file.buffer || require('fs').readFileSync(file.path),
        );
      } else {
        rows = await this.importService.parseExcel(
          file.buffer || require('fs').readFileSync(file.path),
        );
      }
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }

    // Process import asynchronously (fire and forget)
    setImmediate(() => {
      this.importService.processImport(session.id, userId, rows).catch((error) => {
        console.error(`Error processing import session ${session.id}:`, error);
      });
    });

    // Return session immediately
    return ImportSessionResponseDto.fromEntity(session);
  }

  @Get(':sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ): Promise<ImportSessionResponseDto> {
    const session = await this.importService.getSession(sessionId);

    if (!session) {
      throw new BadRequestException('Import session not found');
    }

    // Verify user owns this session
    if (session.userId !== req.user.sub) {
      throw new BadRequestException('Unauthorized access to import session');
    }

    return ImportSessionResponseDto.fromEntity(session);
  }

  @Post('full')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.zip'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only ZIP files are allowed.'), false);
        }
      },
    }),
  )
  async importFull(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    const buffer = file.buffer || require('fs').readFileSync(file.path);
    return this.importService.importFullFromZip(buffer, userId);
  }
}
