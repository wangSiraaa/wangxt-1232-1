import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.validatePassword(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        ...user,
        passwordHash: undefined,
      },
    };
  }

  async getProfile(user: User): Promise<User> {
    return {
      ...user,
      passwordHash: undefined,
    };
  }
}
