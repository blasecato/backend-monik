import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Person } from './person.entity';

@ObjectType()
@Entity('dni_type')
export class DniType {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field()
  @Column({ name: 'type_name', type: 'text' })
  typeName: string;

  @OneToMany(() => Person, (person) => person.dniType)
  persons: Person[];
}
