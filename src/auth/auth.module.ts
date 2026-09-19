import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Person } from '../person/entities/person.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Person, RefreshToken, AuthSession]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // JWT_EXPIRES_IN vacío o ausente => el access token no caduca.
        // La sesión se cierra borrando su fila en `auth_sessions` (logout).
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN')?.trim();
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          ...(expiresIn ? { signOptions: { expiresIn: expiresIn as any } } : {}),
        };
      },
    }),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
