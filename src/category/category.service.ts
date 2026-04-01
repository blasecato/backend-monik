import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ relations: ['products'] });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!category) throw new NotFoundException(`Categoría #${id} no encontrada`);
    return category;
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const category = this.categoryRepository.create({ name: input.name });
    return this.categoryRepository.save(category);
  }

  async update(input: UpdateCategoryInput): Promise<Category> {
    const category = await this.findOne(input.id);
    category.name = input.name;
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<boolean> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
    return true;
  }
}
