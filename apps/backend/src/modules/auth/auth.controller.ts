import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('login')
  async login(@Body() req: any) {
    const user = await this.authService.validateUser(req.username, req.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: any) {
    const { username, password, name, role } = body;
    const existing = await this.usersService.findByUsername(username);
    if (existing) {
      throw new UnauthorizedException('Username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersService.create({
      name: name || username,
      username,
      password: hashedPassword,
      role: role || 'USER'
    });
  }
}
