import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DniType } from './dni-type.entity';
import { Role } from './role.entity';

@ObjectType()
@Entity('person')
export class Person {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field()
  @Column({ type: 'text' })
  name: string;

  @Field()
  @Column({ type: 'text' })
  dni: string;

  @Field()
  @Column({ type: 'text' })
  username: string;

  @Column({ type: 'text' })
  password: string;

  @Field(() => DniType, { nullable: true })
  @ManyToOne(() => DniType, (dniType) => dniType.persons, { nullable: true })
  @JoinColumn({ name: 'dni_type_id' })
  dniType: DniType;

  @Field(() => Role, { nullable: true })
  @ManyToOne(() => Role, (role) => role.persons, { nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
