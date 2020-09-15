import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { Room, roomForMembers, roomForUsers, Response } from './interfaces/rooms.interface';

@Injectable()
export class RoomsService {
  private readonly rooms: Room[] = [];
  private lastChatMessageId = 0;
  private cutRoomForMember(room): roomForMembers {
    return {
      id: room.id,
      name: room.name,
      password: room.password,
      visible: room.visible,
      members: room.members.map(member => ({
        username: member.username,
        socketId: member.socket.id,
      })),
    };
  }
  private formatRoomForUser(room): roomForUsers {
    return {
      id: room.id,
      name: room.name,
      visible: room.visible,
      needPassword: room.password !== '',
    };
  }
  getAll() {
    return this.rooms.filter(room => room.visible).map(room => this.formatRoomForUser(room));
  }
  getRoom(roomId: string) {
    const room = this.rooms.find(room => room.id === roomId);
    return room ? this.formatRoomForUser(room) : undefined;
  }
  getRoomForMembers(roomId: string) {
    const room = this.rooms.find(room => room.id === roomId);
    return room ? this.cutRoomForMember(room) : undefined;
  }
  create(roomData: { name: string; password: string; id: string; visible: boolean }) {
    let id;
    if (roomData.name === undefined) return { error: 'Room has no name' };
    roomData.name = roomData.name.trim();
    if (roomData.name.length < 3) return { error: 'Room name must be 3 to 24 characters long' };
    if (roomData.name.length > 24) return { error: 'Room name must be 3 to 24 characters long' };
    if (roomData.password === undefined) return { error: 'Room has no password' };
    roomData.password = roomData.password.trim();
    if (roomData.password.length > 24) return { error: 'Password must be less than 24 characters long' };
    if (roomData.id) {
      roomData.id = roomData.id.trim();
      if (this.rooms.find(room => room.id === id)) return { error: 'Room with this id already exists' };
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
      visible: roomData.visible,
    });
    return true;
  }
  addToRoom(socket: Socket, payload: { roomId: string; password: string; username: string }): Response<roomForMembers> {
    const room = this.rooms.find(room => room.id === payload.roomId);
    if (!room) return { error: 'There is no room with this id' };
    if (room.password !== payload.password) return { error: 'Wrong password' };
    room.members.push({
      username: payload.username,
      socket: socket,
    });
    socket.join(payload.roomId);
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
  findUsersRoom(socketId: string) {
    for (const room of this.rooms) {
      for (const member of room.members) {
        if (member.socket.id === socketId) return room;
      }
    }
    return false;
  }
  editRoom(roomId: string, name: string, password: string, visible: boolean) {
    const room = this.rooms.find(room => room.id === roomId);
    if (!room) return { error: 'There is no room with this id' };
    if (name === undefined) return { error: 'Room has no name' };
    name = name.trim();
    if (name.length < 3) return { error: 'Room name must be 3 to 24 characters long' };
    if (name.length > 24) return { error: 'Room name must be 3 to 24 characters long' };
    if (password === undefined) return { error: 'Room has no password' };
    password = password.trim();
    if (password.length > 24) return { error: 'Password must be less than 24 characters long' };
    room.name = name;
    room.password = password;
    room.visible = visible;
    return this.cutRoomForMember(room);
  }
  getChatMessageId() {
    this.lastChatMessageId += 1;
    return this.lastChatMessageId;
  }
}
