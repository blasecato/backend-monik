import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardFilterInput } from './dto/dashboard-filter.input';
import { DashboardStats } from './dto/dashboard-stats.output';

@Resolver(() => DashboardStats)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStats, { name: 'dashboard' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'administrador')
  getStats(
    @Args('input', { type: () => DashboardFilterInput, nullable: true })
    input?: DashboardFilterInput,
  ): Promise<DashboardStats> {
    return this.dashboardService.getStats(input ?? {});
  }
}
