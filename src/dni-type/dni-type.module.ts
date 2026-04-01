import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DniType } from '../person/entities/dni-type.entity';
import { DniTypeService } from './dni-type.service';
import { DniTypeResolver } from './dni-type.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([DniType])],
  providers: [DniTypeService, DniTypeResolver],
})
export class DniTypeModule {}
