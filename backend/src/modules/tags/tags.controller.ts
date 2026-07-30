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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    const userId = req.user.sub;
    return this.tagsService.delete(userId, id);
  }
}
