import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ATTACHMENT_MAX_PER_RECORD } from '../attachment.constants';

@Injectable()
export class LimitCheckService {
  constructor(private prisma: PrismaService) {}

  async assertCanAttach(recordType: 'expense' | 'income', recordId: string) {
    const count = await this.prisma.attachments.count({
      where:
        recordType === 'expense' ? { linked_expense_id: recordId } : { linked_income_id: recordId },
    });
    if (count >= ATTACHMENT_MAX_PER_RECORD) {
      throw new BadRequestException('Maximum attachments reached');
    }
  }
}
