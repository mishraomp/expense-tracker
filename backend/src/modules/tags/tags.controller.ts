import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';

@ApiTags('Tags')
@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'tags' })
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Get all tags for the current user
   */
  @Get()
  @ApiOperation({ summary: 'List tags', description: "Lists all of the caller's tags." })
  @ApiOkResponse({ type: [TagResponseDto] })
  async findAll(@Request() req): Promise<TagResponseDto[]> {
    const userId = req.user.sub;
    return this.tagsService.findAll(userId);
  }

  /**
   * Get a single tag by ID
   *
   * A tag ID belonging to another user returns 404 (not 403).
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a tag',
    description:
      'Gets a single tag by ID. A tag ID belonging to another user returns 404 (not 403).',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID.' })
  @ApiOkResponse({ type: TagResponseDto })
  async findOne(@Request() req, @Param('id') id: string): Promise<TagResponseDto> {
    const userId = req.user.sub;
    return this.tagsService.findOne(userId, id);
  }

  /**
   * Create a new tag
   *
   * colorCode must match ^#[0-9A-Fa-f]{6}$. Name uniqueness is
   * case-insensitive per user (409 on duplicate).
   */
  @Post()
  @ApiOperation({
    summary: 'Create a tag',
    description:
      'Creates a tag owned by the caller. colorCode must match ^#[0-9A-Fa-f]{6}$. Name ' +
      'uniqueness is case-insensitive per user (409 on duplicate).',
  })
  @ApiBody({ type: CreateTagDto })
  @ApiCreatedResponse({ type: TagResponseDto })
  async create(@Request() req, @Body() dto: CreateTagDto): Promise<TagResponseDto> {
    const userId = req.user.sub;
    return this.tagsService.create(userId, dto);
  }

  /**
   * Update an existing tag
   *
   * The same case-insensitive duplicate check applies on rename.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a tag',
    description:
      'Updates a tag owned by the caller. The same case-insensitive duplicate check applies on rename.',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID.' })
  @ApiBody({ type: UpdateTagDto })
  @ApiOkResponse({ type: TagResponseDto })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    const userId = req.user.sub;
    return this.tagsService.update(userId, id, dto);
  }

  /**
   * Delete a tag
   *
   * Cascade-removes this tag from all expenses/expense items it was
   * attached to.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a tag',
    description:
      'Deletes a tag owned by the caller. Cascade-removes this tag from all expenses/expense items it was attached to.',
  })
  @ApiParam({ name: 'id', description: 'Tag UUID.' })
  @ApiNoContentResponse({ description: 'Tag deleted successfully.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    const userId = req.user.sub;
    return this.tagsService.delete(userId, id);
  }
}
