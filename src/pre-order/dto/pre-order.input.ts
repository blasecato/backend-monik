import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PreOrderItemInput {
  @Field(() => ID)
  productId: string;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  existingQuantity?: number | null;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  requestedQuantity?: number | null;
}

@InputType()
export class CreatePreOrderInput {
  @Field()
  establishmentName: string;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => [PreOrderItemInput])
  items: PreOrderItemInput[];
}

@InputType()
export class UpdatePreOrderInput extends CreatePreOrderInput {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  version: number;
}

@InputType()
export class PreOrdersFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit?: number;

  @Field(() => String, { nullable: true })
  search?: string;

  /** `true` incluye los prepedidos ya convertidos en pedido. */
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  includeConverted?: boolean;
}
