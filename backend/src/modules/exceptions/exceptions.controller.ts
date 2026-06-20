import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExceptionsService } from './exceptions.service';
import { ExceptionRecord, ExceptionType, ExceptionStatus } from '@/entities/exception-record.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('异常处理')
@ApiBearerAuth()
@Controller('exceptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExceptionsController {
  constructor(private readonly exceptionsService: ExceptionsService) {}

  @Get()
  findAll(
    @Query('batchId') batchId?: string,
    @Query('exceptionType') exceptionType?: ExceptionType,
    @Query('exceptionStatus') exceptionStatus?: ExceptionStatus,
  ): Promise<ExceptionRecord[]> {
    return this.exceptionsService.findAll(batchId, exceptionType, exceptionStatus);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ExceptionRecord> {
    return this.exceptionsService.findById(id);
  }

  @Post()
  @Roles('printing_factory', 'escort', 'exam_site_director', 'admin')
  report(
    @Body() exceptionData: {
      batchId: string;
      boxId?: string;
      packageId?: string;
      exceptionType: ExceptionType;
      description: string;
      location?: string;
      witnesses?: string[];
    },
    @Request() req,
  ): Promise<ExceptionRecord> {
    return this.exceptionsService.report(exceptionData, req.user as User);
  }

  @Put(':id/status')
  @Roles('admin', 'proposition_center')
  updateStatus(
    @Param('id') id: string,
    @Body() body: {
      status: ExceptionStatus;
      investigationResult?: string;
      resolution?: string;
    },
    @Request() req,
  ): Promise<ExceptionRecord> {
    return this.exceptionsService.updateStatus(
      id,
      body.status,
      body.investigationResult,
      body.resolution,
      req.user as User,
    );
  }

  @Put(':id')
  @Roles('admin', 'proposition_center')
  update(
    @Param('id') id: string,
    @Body() data: Partial<ExceptionRecord>,
  ): Promise<ExceptionRecord> {
    return this.exceptionsService.update(id, data);
  }
}
