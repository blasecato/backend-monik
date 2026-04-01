import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Person } from './person.entity';

@ObjectType()
@Entity('role')
export class Role {
  @Field(() => ID)
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Field()
  @Column({ name: 'role_name', type: 'text' })
  roleName: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  key: string;

  @OneToMany(() => Person, (person) => person.role)
  persons: Person[];
}
