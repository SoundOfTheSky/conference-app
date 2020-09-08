import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Controller, Post, Get, Body, Param } from '@nestjs/common';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}
  @Post()
  async create(@Body() createRoomDto: CreateRoomDto) {
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
