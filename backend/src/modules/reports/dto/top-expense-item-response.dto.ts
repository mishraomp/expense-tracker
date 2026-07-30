import { ApiProperty } from '@nestjs/swagger';

export class TopExpenseItemResponseDto {
  name: string;
  totalAmount: string;
  itemCount: number;
  expenseCount: number;

  @ApiProperty({ nullable: true })
  categoryId: string | null;

  @ApiProperty({ nullable: true })
  categoryName: string | null;

  @ApiProperty({ nullable: true })
  colorCode: string | null;
}
