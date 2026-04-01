import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => [Category], { name: 'categories' })
  findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Query(() => Category, { name: 'category' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Mutation(() => Category)
  createCategory(
    @Args('input') input: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.create(input);
  }

  @Mutation(() => Category)
  updateCategory(
    @Args('input') input: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.update(input);
  }

  @Mutation(() => Boolean)
  removeCategory(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<boolean> {
    return this.categoryService.remove(id);
  }
}
