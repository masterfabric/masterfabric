import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Mutation(() => Product)
  async createProduct(@Args('input') input: CreateProductDto): Promise<Product> {
    return this.productService.create(input);
  }

  @Query(() => [Product], { name: 'products' })
  async findAll(): Promise<Product[]> {
    const result = await this.productService.findAll();
    return Array.isArray(result) ? result : [];
  }

  @Query(() => Product, { name: 'product' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productService.findOne(id);
  }

  @Mutation(() => Product)
  async updateProduct(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(id, input);
  }

  @Mutation(() => Product)
  async deleteProduct(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productService.remove(id);
  }
}
