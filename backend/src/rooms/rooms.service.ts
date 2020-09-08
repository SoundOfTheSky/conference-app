import { Socket } from 'socket.io';
import { CreateRoomDto } from './dto/create-room.dto';
import { Injectable } from '@nestjs/common';
import { Room } from './interfaces/rooms.interface';

@Injectable()
export class RoomsService {
  private readonly rooms: Room[] = [];
  getAll() {
    console.log('getAllRooms');
    return [...this.rooms];
  }
  getRoom(roomId: string) {
    console.log('getRoom', roomId);
    return this.rooms.find(room => room.id === roomId);
  }
  create(roomData: CreateRoomDto) {
    console.log('createRoom');
    let id;
    if (roomData.id) {
      if (this.rooms.find(room => room.id === id)) return false;
      id = roomData.id;
    } else {
      id = Math.floor(Math.random() * 1000000) + '';
      while (this.rooms.find(room => room.id === id)) {
        id = Math.floor(Math.random() * 1000000) + '';
      }
    }
    this.rooms.push({
      id: id,
      name: roomData.name,
      password: roomData.password,
      members: [],
    });
    return true;
  }
  addToRoom(roomId: string, password: string, socket: Socket, peer: string) {
    console.log('addToRoom');
    const room = this.rooms.find(room => room.id === roomId);
    if (!room || room.password !== password) return false;
    room.members.push({
      peer: peer,
      socket: socket,
    });
    socket.join(roomId);
    return room.members.map(member => member.peer);
  }
}
