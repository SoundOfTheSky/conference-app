import { Controller, Post, Body, Get, Param, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.services";

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Post()
  addProduct(@Body('title') prodTtile: string,@Body('description') description: string,@Body('price') price: number): any {
    return {id:this.productsService.insertProduct(prodTtile,description,price)};
  }
  @Get()
  getProducts() {
    return this.productsService.getProducts();
  }
  @Get(':id')
  getProduct(@Param('id') id:number) {
    const product = this.productsService.getProduct(id);
    if(!product) throw new NotFoundException('no product with id')
    return product;
  }
}