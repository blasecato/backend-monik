import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import { AuthResponse } from './dto/auth-response';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ExtractJwt } from 'passport-jwt';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Mutation(() => AuthResponse)
  refreshToken(@Args('input') input: RefreshTokenInput): Promise<AuthResponse> {
    return this.authService.refreshTokens(input.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean)
  logout(
    @Args('refreshToken', { nullable: true }) refreshToken: string,
    @Context() context: any,
  ): boolean {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(context.req) as string;
    return this.authService.logout(accessToken, refreshToken);
  }
}
