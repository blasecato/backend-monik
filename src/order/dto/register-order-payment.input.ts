import { InputType, Field, ID, Float } from '@nestjs/graphql';

@InputType()
export class RegisterOrderPaymentInput {
  @Field(() => ID)
  orderId: number;

  /** Monto del abono. Debe ser > 0 y no superar el saldo pendiente. */
  @Field(() => Float)
  amount: number;

  @Field(() => String, { nullable: true })
  note?: string;
}
