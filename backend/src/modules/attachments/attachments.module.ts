import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LimitCheckService } from './services/limit-check.service';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { BulkService } from './bulk.service';
import { BulkController } from './bulk.controller';
import { OrphanScanService } from './orphan-scan.service';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    AttachmentsService,
    BulkService,
    OrphanScanService,
    LimitCheckService,
    GoogleDriveProvider,
    OAuthService,
  ],
  controllers: [AttachmentsController, BulkController, OAuthController],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
