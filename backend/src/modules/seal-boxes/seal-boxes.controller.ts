import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SealBoxesService } from './seal-boxes.service';
import { SealBox } from '@/entities/seal-box.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/entities/user.entity';

@ApiTags('封签箱号管理')
@ApiBearerAuth()
@Controller('seal-boxes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SealBoxesController {
  constructor(private readonly sealBoxesService: SealBoxesService) {}

  @Get()
  findAll(
    @Query('batchId') batchId?: string,
    @Query('examSite') examSite?: string,
  ): Promise<SealBox[]> {
    return this.sealBoxesService.findAll(batchId, examSite);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SealBox> {
    return this.sealBoxesService.findById(id);
  }

  @Get('box-number/:boxNumber')
  findByBoxNumber(@Param('boxNumber') boxNumber: string): Promise<SealBox> {
    return this.sealBoxesService.findByBoxNumber(boxNumber);
  }

  @Post()
  @Roles('printing_factory', 'admin')
  register(
    @Body() boxData: {
      batchId: string;
      boxNumber: string;
      sealNumber: string;
      packageCount: number;
      packageStartNumber: number;
      packageEndNumber: number;
      examSite: string;
    },
    @Request() req,
  ): Promise<SealBox> {
    return this.sealBoxesService.register(boxData, req.user as User);
  }

  @Put(':id/seal')
  @Roles('printing_factory', 'admin')
  seal(@Param('id') id: string, @Request() req): Promise<SealBox> {
    return this.sealBoxesService.seal(id, req.user as User);
  }

  @Put(':id/seal-damaged')
  @Roles('printing_factory', 'escort', 'exam_site_director', 'admin')
  markSealDamaged(@Param('id') id: string): Promise<SealBox> {
    return this.sealBoxesService.markSealDamaged(id);
  }

  @Put(':id/seal-status')
  @Roles('printing_factory', 'escort', 'exam_site_director', 'admin')
  updateSealStatus(
    @Param('id') id: string,
    @Body() body: { intact: boolean },
  ): Promise<SealBox> {
    return this.sealBoxesService.updateSealStatus(id, body.intact);
  }
}
