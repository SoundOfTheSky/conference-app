import { ProductsService } from './products.services';
import { ProductsController } from './products.controller';
import { Module } from "@nestjs/common";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService]
})
export class ProductsModule {}