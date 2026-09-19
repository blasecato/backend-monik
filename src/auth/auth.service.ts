import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Person } from '../person/entities/person.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(AuthSession)
    private readonly authSessionRepository: Repository<AuthSession>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(input: LoginInput): Promise<AuthResponse> {
    const person = await this.personRepository.findOne({
      where: { username: input.username },
      relations: ['dniType', 'role'],
    });

    if (!person || !(await bcrypt.compare(input.password, person.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.generateTokens(person);
  }

  async refreshTokens(token: string): Promise<AuthResponse> {
    const refreshSecret = this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');

    let payload: { sub: number };
    try {
      payload = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token no reconocido');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.delete({ id: storedToken.id });
      throw new UnauthorizedException('Refresh token expirado');
    }

    const person = await this.personRepository.findOne({
      where: { id: payload.sub },
      relations: ['dniType', 'role'],
    });

    if (!person) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Rotación: eliminamos el token usado y emitimos uno nuevo
    await this.refreshTokenRepository.delete({ id: storedToken.id });

    return this.generateTokens(person);
  }

  /**
   * Cierra la sesión del access token recibido: borra su fila en `auth_sessions`,
   * con lo que el token deja de ser válido de inmediato en cualquier instancia.
   */
  async logout(accessToken: string, refreshToken?: string): Promise<boolean> {
    const decoded = this.jwtService.decode(accessToken) as { jti?: string } | null;

    if (decoded?.jti) {
      await this.authSessionRepository.delete({ jti: decoded.jti });
    }

    if (refreshToken) {
      await this.refreshTokenRepository.delete({ token: refreshToken });
    }

    return true;
  }

  /** Una sesión existe mientras su fila siga en `auth_sessions`. */
  async isSessionActive(jti?: string): Promise<boolean> {
    if (!jti) return false;
    const count = await this.authSessionRepository.count({ where: { jti } });
    return count > 0;
  }

  private async generateTokens(person: Person): Promise<AuthResponse> {
    const jti = randomUUID();

    const payload = {
      sub: person.id,
      username: person.username,
      name: person.name,
      dni: person.dni,
      role: person.role?.roleName ?? null,
      roleKey: person.role?.key ?? null,
    };

    // Sin `expiresIn`: el access token no caduca. Su validez la controla
    // la fila de `auth_sessions`, que el logout elimina.
    const accessToken = this.jwtService.sign({ ...payload, jti });

    await this.authSessionRepository.save(
      this.authSessionRepository.create({ jti, personId: person.id }),
    );

    const refreshSecret = this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');
    const refreshExpiresIn = this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN');
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token: refreshToken,
        personId: person.id,
        expiresAt,
      }),
    );

    return { accessToken, refreshToken, person };
  }
}
