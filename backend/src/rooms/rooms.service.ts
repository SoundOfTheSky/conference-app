import { Socket } from 'socket.io';
import { CreateRoomDto } from './dto/create-room.dto';
import { Injectable } from '@nestjs/common';
import { Room } from './interfaces/rooms.interface';

@Injectable()
export class RoomsService {
  private readonly rooms: Room[] = [];
  private lastChatMessageId = 0;
  private lastUserId = 0;
  private cutRoomForMember(room) {
    return {
      name: room.name,
      password: room.password,
      members: room.members.map(member => ({ userId: member.userId, username: member.username })),
    };
  }
  getAll() {
    console.log('getAllRooms');
    return this.rooms.map(el => ({ name: el.name, id: el.id }));
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
  addToRoom(socket: Socket, roomId: string, password: string, username: string) {
    console.log('addToRoom');
    const room = this.rooms.find(room => room.id === roomId);
    if (!room || room.password !== password) return false;
    room.members.push({
      userId: this.getUserId() + '',
      username: username,
      socket: socket,
    });
    socket.join(roomId);
    return this.cutRoomForMember(room);
  }
  findUsersRoom(userId: string) {
    for (const room of this.rooms) {
      for (const member of room.members) {
        if (member.userId === userId) return room;
      }
    }
    return false;
  }
  getChatMessageId() {
    this.lastChatMessageId += 1;
    return this.lastChatMessageId;
  }
  getUserId() {
    this.lastUserId += 1;
    return this.lastUserId;
  }
}
