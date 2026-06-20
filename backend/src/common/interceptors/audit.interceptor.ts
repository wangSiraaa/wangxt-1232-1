import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@/entities/audit-log.entity';
import { User } from '@/entities/user.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(async (data) => {
        if (user && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          const auditLog = this.auditLogRepository.create({
            user: user,
            action: `${method} ${url}`,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
          await this.auditLogRepository.save(auditLog);
        }
      }),
    );
  }
}
