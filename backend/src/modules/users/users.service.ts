import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '@/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'fullName', 'role', 'organization', 'phone', 'isActive', 'createdAt'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role, isActive: true },
      select: ['id', 'username', 'fullName', 'role', 'organization', 'phone'],
    });
  }

  async create(userData: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    organization?: string;
    phone?: string;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const user = this.usersRepository.create({
      ...userData,
      passwordHash,
    });
    return this.usersRepository.save(user);
  }

  async update(id: string, userData: Partial<User> & { password?: string }): Promise<User> {
    const user = await this.findById(id);
    if (userData.password) {
      userData.passwordHash = await bcrypt.hash(userData.password, 10);
      delete userData.password;
    }
    Object.assign(user, userData);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    user.isActive = false;
    await this.usersRepository.save(user);
  }

  async validatePassword(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (isMatch) {
        return user;
      }
    }
    return null;
  }
}
