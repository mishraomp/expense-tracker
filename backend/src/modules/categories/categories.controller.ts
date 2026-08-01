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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'categories' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Lists predefined + the caller's custom categories, each enriched with
   * its currently-active budget for the given date.
   */
  @Get()
  @ApiOperation({
    summary: 'List categories',
    description:
      "Lists predefined + the caller's custom categories, each enriched with its currently-active budget for the given date.",
  })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  @ApiQuery({
    name: 'targetDate',
    required: false,
    description:
      'ISO date (YYYY-MM-DD); selects which budget period is active for each category. Defaults to today.',
  })
  findAll(@Request() req, @Query('targetDate') targetDate?: string) {
    const userId = req.user.sub;
    const date = targetDate ? new Date(targetDate) : undefined;
    return this.categoriesService.findAll(userId, date);
  }

  /**
   * Creates a custom category owned by the caller. See CreateCategoryDto for
   * field semantics, including name-uniqueness and budget precedence rules.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a category',
    description:
      'Creates a custom category owned by the caller. See CreateCategoryDto for field semantics, including name-uniqueness and budget precedence rules.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Body() body: CreateCategoryDto, @Request() req) {
    const userId = req.user.sub;
    return this.categoriesService.create(userId, body);
  }

  /**
   * Updates a category. For type:'predefined' categories, changing name or
   * icon throws 403 — only colorCode and budget fields are editable on
   * predefined categories. See UpdateCategoryDto for the budgetAmount
   * tri-state (omit vs. null vs. value) semantics.
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update a category',
    description:
      "For type:'predefined' categories, changing name or icon throws 403 — only colorCode and " +
      'budget fields are editable on predefined categories. See UpdateCategoryDto for the ' +
      'budgetAmount tri-state (omit vs. null vs. value) semantics.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID.' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto, @Request() req) {
    const userId = req.user.sub;
    return this.categoriesService.update(userId, id, body);
  }

  /**
   * Soft-deletes a custom category owned by the caller (sets deletedAt) —
   * the record is not physically removed. Predefined or other-users'
   * categories return 403.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a category',
    description:
      'Soft-deletes a custom category owned by the caller (sets deletedAt) — the record is not ' +
      "physically removed. Predefined or other-users' categories return 403.",
  })
  @ApiParam({ name: 'id', description: 'Category UUID.' })
  @ApiOkResponse({ description: 'Category soft-deleted successfully.' })
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.categoriesService.remove(userId, id);
  }
}
