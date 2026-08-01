import { Controller, Get, Res, Request, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ExportService } from './export.service';
import type { Response } from 'express';

@ApiBearerAuth('bearer')
@ApiTags('Export')
@Controller({ version: '1', path: 'export' })
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Streams a ZIP (binary, not JSON — sent via a raw response, bypassing Nest's normal
   * response pipeline) containing exactly three CSVs: categories.csv (name, type, color_code,
   * icon, budget_amount, budget_period), subcategories.csv (category, name, budget_amount,
   * budget_period), expenses.csv (date, amount, category, subcategory, description, status,
   * source, merchant_name) — scoped to the caller's own data plus global predefined
   * categories. No query parameters exist — this always exports everything.
   */
  @Get('full')
  @ApiOperation({
    summary: 'Export the caller data as a ZIP archive',
    description:
      'Streams a ZIP (binary, not JSON) containing exactly three CSVs: categories.csv (name, ' +
      'type, color_code, icon, budget_amount, budget_period), subcategories.csv (category, ' +
      'name, budget_amount, budget_period), expenses.csv (date, amount, category, subcategory, ' +
      "description, status, source, merchant_name) — scoped to the caller's own data plus " +
      'global predefined categories. No query parameters exist — this always exports everything. ' +
      'NOTE: an MCP/JSON-only client cannot consume a binary ZIP body meaningfully.',
  })
  @ApiProduces('application/zip')
  @ApiOkResponse({
    description: 'ZIP archive containing categories.csv, subcategories.csv, and expenses.csv.',
    content: { 'application/zip': { schema: { type: 'string', format: 'binary' } } },
  })
  @Header('Content-Type', 'application/zip')
  async fullExport(@Request() req: any, @Res() res: Response) {
    const userId = req.user.sub;
    const buffer = await this.exportService.generateUserExportZip(userId);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Disposition', `attachment; filename="expense-tracker-export-${ts}.zip"`);
    res.end(buffer);
  }
}
