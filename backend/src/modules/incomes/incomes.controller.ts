import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Create an income',
    description:
      'When isRecurring=true, silently bulk-creates MANY additional Income rows (either exactly ' +
      'numberOfRecurrences future occurrences, or if omitted, rolls forward by frequency for up ' +
      'to 1 year) — but the response only returns the single originally-created record, with no ' +
      "indication of how many rows were actually inserted. If frequency is 'one_time' or " +
      'unrecognized while isRecurring=true, zero extra occurrences are created (silent no-op).',
  })
  @ApiBody({ type: CreateIncomeDto })
  @ApiCreatedResponse({ type: IncomeResponseDto })
  async create(@Request() req, @Body() dto: CreateIncomeDto): Promise<IncomeResponseDto> {
    // Keycloak stores the user identifier in the `sub` claim
    return this.incomesService.create(req.user.sub, dto);
  }

  /**
   * Lists incomes — see IncomeListQueryDto for filters.
   */
  @Get()
  @ApiOperation({
    summary: 'List incomes',
    description:
      'Lists the caller’s incomes — combine query parameters to filter by date range, source, frequency, or employer.',
  })
  @ApiOkResponse({ type: [IncomeResponseDto] })
  @ApiQuery({ name: 'year', required: false, description: 'Calendar year, from 1900 to 3000.' })
  @ApiQuery({ name: 'month', required: false, description: 'Calendar month, from 1 to 12.' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date, inclusive.' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date, inclusive.' })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['salary', 'bonus', 'investment', 'rental', 'freelance', 'gift', 'other'],
  })
  @ApiQuery({
    name: 'frequency',
    required: false,
    enum: ['one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual'],
  })
  @ApiQuery({ name: 'employer', required: false, description: 'Case-insensitive substring match.' })
  async findAll(@Request() req, @Query() query: IncomeListQueryDto): Promise<IncomeResponseDto[]> {
    return this.incomesService.findAll(req.user.sub, query);
  }

  /**
   * Unlike list/create/update, this populates the `attachments` array (active
   * attachment metadata) in addition to `attachmentCount`.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get an income',
    description:
      'Gets a single income by ID, scoped to the caller. Unlike list/create/update responses, ' +
      'this one populates the `attachments` array (active attachment metadata) in addition to `attachmentCount`.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID.' })
  @ApiOkResponse({ type: IncomeResponseDto })
  async findOne(@Request() req, @Param('id') id: string): Promise<IncomeResponseDto> {
    return this.incomesService.findOne(req.user.sub, id);
  }

  /**
   * Unlike create, updating isRecurring/numberOfRecurrences here does NOT
   * regenerate or create future occurrences — those fields have no effect on
   * PUT.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update an income',
    description:
      'Unlike create, updating isRecurring/numberOfRecurrences here does NOT regenerate or ' +
      'create future occurrences — those fields have no effect on PUT.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID.' })
  @ApiBody({ type: UpdateIncomeDto })
  @ApiOkResponse({ type: IncomeResponseDto })
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
  @ApiOperation({
    summary: 'Delete an income',
    description: 'Soft-deletes the income (sets deletedAt) — the record is not physically removed.',
  })
  @ApiParam({ name: 'id', description: 'Income UUID.' })
  @ApiOkResponse({
    schema: {
      example: { message: 'Income deleted successfully' },
      type: 'object',
      properties: { message: { type: 'string' } },
    },
  })
  async remove(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.incomesService.remove(req.user.sub, id);
    return { message: 'Income deleted successfully' };
  }
}
