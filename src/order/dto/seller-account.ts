import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SellerAccountPayment {
  @Field(() => ID)
  id: number;

  @Field(() => ID)
  orderId: number;

  @Field()
  collectedAt: Date;

  @Field()
  orderDate: Date;

  @Field(() => String, { nullable: true })
  establishmentName: string | null;

  @Field(() => String, { nullable: true })
  note: string | null;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class SellerAccount {
  @Field(() => ID)
  sellerId: number;

  @Field()
  sellerName: string;

  @Field()
  from: string;

  @Field()
  to: string;

  @Field(() => Float)
  totalCollected: number;

  @Field(() => Int)
  orderCount: number;

  @Field(() => [SellerAccountPayment])
  payments: SellerAccountPayment[];
}
