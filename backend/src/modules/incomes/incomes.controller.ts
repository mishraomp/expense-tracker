import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomeListQueryDto } from './dto/income-list-query.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@ApiTags('Incomes')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'incomes' })
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  /**
   * When isRecurring=true, silently bulk-creates MANY additional Income rows
   * (either exactly numberOfRecurrences future occurrences, or if omitted,
   * rolls forward by frequency for up to 1 year) — but the response only
   * returns the single originally-created record, with no indication of how
   * many rows were actually inserted. If frequency is 'one_time' or
   * unrecognized while isRecurring=true, zero extra occurrences are created
   * (silent no-op).
   */
  @Post()
  async create(@Request() req, @Body() dto: CreateIncomeDto): Promise<IncomeResponseDto> {
    // Keycloak stores the user identifier in the `sub` claim
    return this.incomesService.create(req.user.sub, dto);
  }

  /**
   * Lists incomes — see IncomeListQueryDto for filters.
   */
  @Get()
  async findAll(@Request() req, @Query() query: IncomeListQueryDto): Promise<IncomeResponseDto[]> {
    return this.incomesService.findAll(req.user.sub, query);
  }

  /**
   * The response includes an `attachments` array that is NOT part of
   * IncomeResponseDto's declared fields (bolted on dynamically) — the true
   * response shape differs from what the DTO documents.
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string): Promise<IncomeResponseDto> {
    return this.incomesService.findOne(req.user.sub, id);
  }

  /**
   * Unlike create, updating isRecurring/numberOfRecurrences here does NOT
   * regenerate or create future occurrences — those fields have no effect on
   * PUT.
   */
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomesService.update(req.user.sub, id, dto);
  }

  /**
   * Soft-deletes the income (sets deletedAt).
   */
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.incomesService.remove(req.user.sub, id);
    return { message: 'Income deleted successfully' };
  }
}
