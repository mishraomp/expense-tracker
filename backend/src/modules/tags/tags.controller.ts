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
import { ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto, TagResponseDto } from './dto';

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
   */
  @Get(':id')
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TagResponseDto> {
    const userId = req.user.sub;
    return this.tagsService.findOne(userId, id);
  }

  /**
   * Create a new tag
   */
  @Post()
  async create(
    @Request() req,
    @Body() dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    const userId = req.user.sub;
    return this.tagsService.create(userId, dto);
  }

  /**
   * Update an existing tag
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
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.sub;
    return this.tagsService.delete(userId, id);
  }
}
