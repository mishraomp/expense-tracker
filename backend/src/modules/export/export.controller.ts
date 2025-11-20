import { Controller, Get, Res, Request, Header } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ExportService } from './export.service';
import type { Response } from 'express';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'export' })
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('full')
  @Header('Content-Type', 'application/zip')
  async fullExport(@Request() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const buffer = await this.exportService.generateUserExportZip(userId);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Disposition', `attachment; filename="expense-tracker-export-${ts}.zip"`);
    res.end(buffer);
  }
}
