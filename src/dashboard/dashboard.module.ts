import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule],
  providers: [DashboardService, DashboardResolver],
})
export class DashboardModule {}
