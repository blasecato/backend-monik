import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Query(() => [Product], { name: 'products' })
  findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }

  @Query(() => [Product], { name: 'productsAdmin' })
  findAllAdmin(): Promise<Product[]> {
    return this.productService.findAllAdmin();
  }

  @Query(() => Product, { name: 'product' })
  findOne(@Args('id', { type: () => ID }) id: number): Promise<Product> {
    return this.productService.findOne(id);
  }

  @Mutation(() => Product)
  createProduct(
    @Args('input') input: CreateProductInput,
  ): Promise<Product> {
    return this.productService.create(input);
  }

  @Mutation(() => Product)
  updateProduct(
    @Args('input') input: UpdateProductInput,
  ): Promise<Product> {
    return this.productService.update(input);
  }

  @Mutation(() => Boolean)
  removeProduct(
    @Args('id', { type: () => ID }) id: number,
  ): Promise<boolean> {
    return this.productService.remove(id);
  }
}
