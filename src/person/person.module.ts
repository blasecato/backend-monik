import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { DniType } from './entities/dni-type.entity';
import { Role } from './entities/role.entity';
import { PersonService } from './person.service';
import { PersonResolver } from './person.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Person, DniType, Role])],
  providers: [PersonService, PersonResolver],
  exports: [PersonService],
})
export class PersonModule {}
