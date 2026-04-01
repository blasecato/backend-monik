import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../../person/entities/person.entity';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: number;
  username: string;
  name: string;
  dni: string;
  role: string | null;
  roleKey: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<Person> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any) as string;

    if (this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Sesión cerrada, inicia sesión nuevamente');
    }

    const person = await this.personRepository.findOne({
      where: { id: payload.sub },
      relations: ['dniType', 'role'],
    });

    if (!person) throw new UnauthorizedException('Usuario no encontrado');

    return person;
  }
}
