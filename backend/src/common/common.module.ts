import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@/entities/audit-log.entity';
import { EncryptionService } from './services/encryption.service';
import { QrCodeService } from './services/qrcode.service';
import { TimeValidatorService } from './services/time-validator.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    EncryptionService,
    QrCodeService,
    TimeValidatorService,
    AuditInterceptor,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    HttpExceptionFilter,
  ],
  exports: [
    EncryptionService,
    QrCodeService,
    TimeValidatorService,
    AuditInterceptor,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    HttpExceptionFilter,
  ],
})
export class CommonModule {}
