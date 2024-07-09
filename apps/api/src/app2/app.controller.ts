import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    console.log('AppController init', appService);
  }

  @Get()
  getHello(): string {
    return this.appService
      ? this.appService.getHello()
      : 'Something went wrong with dependency injection! this.appService is undefined!';
  }
}
