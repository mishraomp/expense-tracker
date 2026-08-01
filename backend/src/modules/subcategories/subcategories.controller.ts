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
import { SubcategoriesService, SubcategoryWithBudget } from './subcategories.service';
import {
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  SubcategoryQueryDto,
} from './subcategories.dto';
import { SubcategoryResponseDto } from './subcategory-response.dto';

// KNOWN GAP: this controller does not filter by the authenticated user — see
// SubcategoriesService (subcategories.service.ts) for the full finding: no
// method here filters by userId, so any authenticated caller can currently
// read/update/delete any OTHER user's subcategories by ID, and findAll()
// without a categoryId returns every user's subcategories. Not fixed here —
// flagged for separate follow-up.
@ApiTags('Subcategories')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'subcategories' })
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  /**
   * Parent category must exist (400 if not). Name uniqueness is per-category
   * and CASE-SENSITIVE (unlike categories/tags) — 'Groceries' and 'groceries'
   * can coexist as siblings; 409 on an exact duplicate. Capped at 50
   * subcategories per category (409 if exceeded).
   */
  @Post()
  @ApiOperation({
    summary: 'Create a subcategory',
    description:
      'Parent category must exist (400 if not). Name uniqueness is per-category and ' +
      "CASE-SENSITIVE (unlike categories/tags) — 'Groceries' and 'groceries' can coexist as " +
      'siblings; 409 on an exact duplicate. Capped at 50 subcategories per category (409 if exceeded).',
  })
  @ApiBody({ type: CreateSubcategoryDto })
  @ApiCreatedResponse({ type: SubcategoryResponseDto })
  async create(@Body() dto: CreateSubcategoryDto): Promise<SubcategoryWithBudget> {
    return this.subcategoriesService.create(dto);
  }

  /**
   * Lists subcategories, optionally filtered by category.
   */
  @Get()
  @ApiOperation({
    summary: 'List subcategories',
    description:
      'Lists subcategories, optionally filtered by category. KNOWN GAP: not scoped by user — ' +
      'omitting categoryId returns every user’s subcategories, not just the caller’s.',
  })
  @ApiOkResponse({ type: [SubcategoryResponseDto] })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description:
      'Parent category UUID to filter by. Omitting it lists subcategories across ALL categories.',
  })
  async findAll(@Query() query: SubcategoryQueryDto): Promise<SubcategoryWithBudget[]> {
    return this.subcategoriesService.findAll(query.categoryId);
  }

  /**
   * Gets a single subcategory by ID, including its parent category.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a subcategory',
    description:
      'Gets a single subcategory by ID, including its parent category. KNOWN GAP: not scoped ' +
      'by user — any authenticated caller can read any subcategory by ID.',
  })
  @ApiOkResponse({ type: SubcategoryResponseDto })
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  async findOne(@Param('id') id: string) {
    return this.subcategoriesService.findOneWithCategory(id);
  }

  /**
   * Changing categoryId moves the subcategory to a different category
   * (re-validates it exists, re-checks name uniqueness in the new parent).
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a subcategory',
    description:
      'Changing categoryId moves the subcategory to a different category (re-validates it ' +
      'exists, re-checks name uniqueness in the new parent). KNOWN GAP: not scoped by user — ' +
      'any authenticated caller can update any subcategory by ID.',
  })
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  @ApiBody({ type: UpdateSubcategoryDto })
  @ApiOkResponse({ type: SubcategoryResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
  ): Promise<SubcategoryWithBudget> {
    return this.subcategoriesService.update(id, dto);
  }

  /**
   * Hard-deletes the subcategory row. Any expenses/expense_items referencing
   * it have their subcategory_id set to NULL (not deleted); any budgets tied
   * to it are cascade-deleted. The returned affectedExpenses count only
   * covers the expenses table, not expense_items or budgets. Note the
   * contract difference: this endpoint uses @HttpCode(HttpStatus.OK) and
   * returns 200 with a body, unlike tags.controller.ts's delete, which
   * returns 204 No Content.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a subcategory',
    description:
      'Hard-deletes the subcategory row. Any expenses/expense_items referencing it have their ' +
      'subcategory_id set to NULL (not deleted); any budgets tied to it are cascade-deleted. The ' +
      'returned affectedExpenses count only covers the expenses table, not expense_items or ' +
      'budgets. Contract note: unlike tags.controller.ts delete (204 No Content), this returns ' +
      '200 with a body. KNOWN GAP: not scoped by user — any authenticated caller can delete any ' +
      'subcategory by ID.',
  })
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  @ApiOkResponse({
    schema: {
      example: { affectedExpenses: 0 },
      type: 'object',
      properties: { affectedExpenses: { type: 'integer' } },
    },
  })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ affectedExpenses: number }> {
    return this.subcategoriesService.remove(id);
  }

  /**
   * Counts rows in the expenses table only — does not include expense_items
   * referencing this subcategory.
   */
  @Get(':id/expenses-count')
  @ApiOperation({
    summary: 'Count expenses in a subcategory',
    description:
      'Counts rows in the expenses table only — does not include expense_items referencing this subcategory.',
  })
  @ApiParam({ name: 'id', description: 'Subcategory UUID.' })
  @ApiOkResponse({
    schema: {
      example: { count: 0 },
      type: 'object',
      properties: { count: { type: 'integer' } },
    },
  })
  async getExpensesCount(@Param('id') id: string): Promise<{ count: number }> {
    return this.subcategoriesService.expensesCount(id);
  }
}
