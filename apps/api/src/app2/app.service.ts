import { Injectable } from '@nestjs/common';

console.log('AppService init');

@Injectable()
export class AppService {
  constructor() {
    console.log('AppService has been created');
  }
  getHello(): string {
    return 'Hello World!';
  }
}
