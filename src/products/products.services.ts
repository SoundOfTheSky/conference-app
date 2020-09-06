import { Product } from './products.model';
import { Injectable } from "@nestjs/common";

@Injectable()
export class ProductsService {
  products: Product[] = [];

  insertProduct(title: string, desc: string, price: number) {
    const prodId=new Date().getTime();
    const newProduct = new Product(prodId, title,desc,price);
    this.products.push(newProduct);
    return prodId;
  }
  getProducts() {
    return [...this.products];
  }
  getProduct(id) {
    console.log(this.products[0].id, id,this.products[0].id===id);
    return this.products.find(el=>el.id===parseInt(id));
  }
}