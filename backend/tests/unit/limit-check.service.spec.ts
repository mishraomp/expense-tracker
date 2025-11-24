import { describe, it, expect } from 'vitest';
import { LimitCheckService } from '../../src/modules/attachments/services/limit-check.service';
import { ATTACHMENT_MAX_PER_RECORD } from '../../src/modules/attachments/attachment.constants';

function makeServiceWithCount(count: number) {
  const mockPrisma = {
    attachments: {
      count: async () => count,
    },
  } as any;
  return new LimitCheckService(mockPrisma);
}

describe('LimitCheckService', () => {
  it('allows attaching below limit', async () => {
    const svc = makeServiceWithCount(ATTACHMENT_MAX_PER_RECORD - 1);
    await expect(svc.assertCanAttach('expense', 'exp1')).resolves.toBeUndefined();
  });

  it('blocks attaching at limit', async () => {
    const svc = makeServiceWithCount(ATTACHMENT_MAX_PER_RECORD);
    await expect(svc.assertCanAttach('expense', 'exp1')).rejects.toThrow(
      'Maximum attachments reached',
    );
  });
});
