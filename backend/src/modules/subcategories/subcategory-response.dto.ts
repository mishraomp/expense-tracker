import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubcategoryParentCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['predefined', 'custom'] })
  type: 'predefined' | 'custom';

  @ApiProperty({ format: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty({ nullable: true })
  colorCode: string | null;

  @ApiProperty({ nullable: true })
  icon: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  deletedAt: Date | null;
}

export class SubcategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ format: 'uuid' })
  categoryId: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  budgetAmount: string | null;

  @ApiProperty({ enum: ['monthly', 'annual'], nullable: true })
  budgetPeriod: 'monthly' | 'annual' | null;

  @ApiProperty({ nullable: true })
  budgetStartDate: string | null;

  @ApiProperty({ nullable: true })
  budgetEndDate: string | null;

  @ApiPropertyOptional({ type: () => SubcategoryParentCategoryDto })
  category?: SubcategoryParentCategoryDto;
}
