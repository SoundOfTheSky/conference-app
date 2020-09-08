import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { RoomsModule } from './rooms/rooms.module';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: __dirname + '/../../frontend/dist',
    }),
    RoomsModule,
  ],
})
export class AppModule {}
