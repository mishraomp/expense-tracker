import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SubcategoriesService, SubcategoryWithBudget } from './subcategories.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto, SubcategoryQueryDto } from './dto';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'subcategories' })
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  async create(@Body() dto: CreateSubcategoryDto): Promise<SubcategoryWithBudget> {
    return this.subcategoriesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: SubcategoryQueryDto): Promise<SubcategoryWithBudget[]> {
    return this.subcategoriesService.findAll(query.categoryId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subcategoriesService.findOneWithCategory(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
  ): Promise<SubcategoryWithBudget> {
    return this.subcategoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ affectedExpenses: number }> {
    return this.subcategoriesService.remove(id);
  }

  @Get(':id/expenses-count')
  async getExpensesCount(@Param('id') id: string): Promise<{ count: number }> {
    return this.subcategoriesService.expensesCount(id);
  }
}
