import { RoomsService } from './rooms.service';
import { Controller, Post, Get, Body, Param } from '@nestjs/common';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}
  @Post()
  async create(@Body() createRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  async getAll() {
    return this.roomsService.getAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.getRoom(id) || false;
  }
}
