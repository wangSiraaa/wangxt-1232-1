import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User, UserRole } from '@/entities/user.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Get('role/:role')
  @Roles('admin')
  findByRole(@Param('role') role: UserRole): Promise<User[]> {
    return this.usersService.findByRole(role);
  }

  @Post()
  @Roles('admin')
  create(
    @Body() userData: {
      username: string;
      password: string;
      fullName: string;
      role: UserRole;
      organization?: string;
      phone?: string;
    },
  ): Promise<User> {
    return this.usersService.create(userData);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() userData: Partial<User>): Promise<User> {
    return this.usersService.update(id, userData);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
