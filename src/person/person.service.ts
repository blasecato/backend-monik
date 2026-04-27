import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Person } from './entities/person.entity';
import { DniType } from './entities/dni-type.entity';
import { Role } from './entities/role.entity';
import { CreatePersonInput } from './dto/create-person.input';
import { UpdatePersonInput } from './dto/update-person.input';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(DniType)
    private readonly dniTypeRepository: Repository<DniType>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  private buildPersonQuery() {
    return this.personRepository
      .createQueryBuilder('person')
      .leftJoinAndSelect('person.dniType', 'dniType')
      .leftJoinAndSelect('person.role', 'role');
  }

  findAll(): Promise<Person[]> {
    return this.buildPersonQuery().orderBy('person.id', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Person> {
    const person = await this.buildPersonQuery()
      .where('person.id = :id', { id })
      .getOne();
    if (!person) throw new NotFoundException(`Persona #${id} no encontrada`);
    return person;
  }

  async create(input: CreatePersonInput): Promise<Person> {
    const existing = await this.personRepository.findOne({
      where: { username: input.username },
    });
    if (existing) throw new ConflictException(`El username '${input.username}' ya está en uso`);

    const person = this.personRepository.create({
      name: input.name,
      dni: input.dni,
      username: input.username,
      password: await bcrypt.hash(input.password, 10),
    });

    if (input.dniTypeId) {
      const dniType = await this.dniTypeRepository.findOne({ where: { id: input.dniTypeId } });
      if (!dniType) throw new NotFoundException(`Tipo de DNI #${input.dniTypeId} no encontrado`);
      person.dniType = dniType;
    }

    const roleId = input.roleId ?? 2;
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Rol #${roleId} no encontrado`);
    person.role = role;

    const saved = await this.personRepository.save(person);
    return this.findOne(saved.id);
  }

  async remove(id: number): Promise<boolean> {
    const person = await this.findOne(id);
    await this.personRepository.remove(person);
    return true;
  }

  async update(input: UpdatePersonInput): Promise<Person> {
    const person = await this.findOne(input.id);

    if (input.name !== undefined) person.name = input.name;
    if (input.dni !== undefined) person.dni = input.dni;

    if (input.username !== undefined && input.username !== person.username) {
      const existing = await this.personRepository.findOne({
        where: { username: input.username },
      });
      if (existing) throw new ConflictException(`El username '${input.username}' ya está en uso`);
      person.username = input.username;
    }

    if (input.dniTypeId !== undefined) {
      const dniType = await this.dniTypeRepository.findOne({ where: { id: input.dniTypeId } });
      if (!dniType) throw new NotFoundException(`Tipo de DNI #${input.dniTypeId} no encontrado`);
      person.dniType = dniType;
    }

    if (input.roleId !== undefined) {
      const role = await this.roleRepository.findOne({ where: { id: input.roleId } });
      if (!role) throw new NotFoundException(`Rol #${input.roleId} no encontrado`);
      person.role = role;
    }

    return this.personRepository.save(person);
  }
}
