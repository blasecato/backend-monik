import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DniType } from '../person/entities/dni-type.entity';

@Injectable()
export class DniTypeService {
  constructor(
    @InjectRepository(DniType)
    private readonly dniTypeRepository: Repository<DniType>,
  ) {}

  findAll(): Promise<DniType[]> {
    return this.dniTypeRepository.find({ order: { id: 'ASC' } });
  }
}
