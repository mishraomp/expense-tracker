import { Body, Controller, Delete, Get, Param, Post, Put, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiBearerAuth('bearer')
@Controller({ version: '1', path: 'categories' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Request() req) {
    const userId = req.user.sub;
    return this.categoriesService.findAll(userId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number;
      budgetPeriod?: 'monthly' | 'annual';
    },
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.categoriesService.create(userId, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      colorCode?: string;
      icon?: string;
      budgetAmount?: string | number | null;
      budgetPeriod?: 'monthly' | 'annual' | null;
    },
    @Request() req,
  ) {
    const userId = req.user.sub;
    return this.categoriesService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.sub;
    return this.categoriesService.remove(userId, id);
  }
}
