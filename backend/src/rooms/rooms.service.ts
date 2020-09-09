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
      id: room.id,
      name: room.name,
      password: room.password,
      members: room.members.map(member => ({ userId: member.userId, username: member.username })),
    };
  }
  private formatRoomForUser(room) {
    return {
      id: room.id,
      name: room.name,
      needPassword: room.password !== '',
    };
  }
  getAll() {
    console.log('getAllRooms');
    return this.rooms.filter(room => room.visible).map(room => this.formatRoomForUser(room));
  }
  getRoom(roomId: string) {
    console.log('getRoom', roomId);
    const room = this.rooms.find(room => room.id === roomId);
    return room ? this.formatRoomForUser(room) : undefined;
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
      visible: true,
    });
    return true;
  }
  addToRoom(socket: Socket, roomId: string, password: string, username: string) {
    const room = this.rooms.find(room => room.id === roomId);
    if (!room || room.password !== password) return false;
    room.members.push({
      userId: this.getUserId() + '',
      username: username,
      socket: socket,
    });
    console.log('addToRoom', roomId);
    socket.join(roomId);
    return this.cutRoomForMember(room);
  }
  removeAnyRoom(socket: Socket) {
    for (const room of this.rooms) {
      for (let memberIndex = 0; memberIndex < room.members.length; memberIndex++) {
        if (room.members[memberIndex].socket.id === socket.id) {
          room.members.splice(memberIndex, 1);
          return this.cutRoomForMember(room);
        }
      }
    }
  }
  findUsersRoom(userId: string) {
    for (const room of this.rooms) {
      for (const member of room.members) {
        if (member.userId === userId) return room;
      }
    }
    return false;
  }
  editRoom(roomId: string, name: string, password: string) {
    const room = this.rooms.find(room => room.id === roomId);
    if (!room) return false;
    console.log('ok');
    room.name = name;
    room.password = password;
    return this.cutRoomForMember(room);
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
