import { IsIn, IsOptional, IsArray, IsString } from 'class-validator';

// NOTE: this class must keep at least one class-validator decorator per field. The app's
// global ValidationPipe (main.ts) uses whitelist+forbidNonWhitelisted, and NestJS only skips
// that pipeline for bare String/Boolean/Number/Array/Object/Buffer/Date metatypes — a plain
// `interface` erases to Object at runtime and was skipped (which is why the original
// undecorated interface worked with zero validators), but a real `class` is not skipped. An
// undecorated class here would cause every field to be treated as non-whitelisted and every
// request to be rejected with 400. The decorators below only mirror the manual checks already
// performed in startBulkUpload(); they don't add any new validation constraint.
export class BulkUploadDto {
  /** Which record type every file in this batch links to. */
  @IsIn(['expense', 'income'])
  recordType: 'expense' | 'income';

  /**
   * Optional per-file record ID mapping. If provided, its length must equal `files.length`
   * (validated manually in the handler, not via class-validator) — element `i` maps to
   * `files[i]`. Files whose slot is omitted/undefined are skipped, not auto-matched.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recordIds?: string[];
}
