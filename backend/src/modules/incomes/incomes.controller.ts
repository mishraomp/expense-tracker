import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomeListQueryDto } from './dto/income-list-query.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@ApiBearerAuth('incomes')
@Controller({ version: '1', path: 'incomes' })
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateIncomeDto): Promise<IncomeResponseDto> {
    // Keycloak stores the user identifier in the `sub` claim
    return this.incomesService.create(req.user.sub, dto);
  }

  @Get()
  async findAll(@Request() req, @Query() query: IncomeListQueryDto): Promise<IncomeResponseDto[]> {
    return this.incomesService.findAll(req.user.sub, query);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string): Promise<IncomeResponseDto> {
    return this.incomesService.findOne(req.user.sub, id);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomesService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    await this.incomesService.remove(req.user.sub, id);
    return { message: 'Income deleted successfully' };
  }
}
