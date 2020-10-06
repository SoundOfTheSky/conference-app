import { RoomsService } from './rooms.service';
import { RoomMemberGuard } from './rooms.guards';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import * as CryptoJS from 'crypto-js';
import config from '../config';

@WebSocketGateway()
export class RoomsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: RoomsService) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  @SubscribeMessage('joinRoom')
  joinRoom(socket: Socket, payload: { roomId: string; password: string; username: string }) {
    const room = this.roomsService.addToRoom(socket, payload);
    if (!room) return false;
    if (!room.error) this.server.to(room.id).emit('roomChange', room);
    return room;
  }
  @UseGuards(RoomMemberGuard)
  @SubscribeMessage('changeRoomSettings')
  changeRoomSettings(socket: Socket, payload: { id: string; name: string; password: string; visible }) {
    const answer = this.roomsService.editRoom(payload.id, payload.name, payload.password, payload.visible);
    if ('error' in answer && answer.error) {
      if (payload.id) this.server.to(payload.id).emit('roomChange', this.roomsService.getRoomForMembers(payload.id));
    } else this.server.to(payload.id).emit('roomChange', answer);
  }
  //@UseGuards(RoomMemberGuard)
  @SubscribeMessage('RTCSendDescription')
  RTCSendDescription(socket: Socket, payload: { socketId: string; offer: any }) {
    this.server.to(payload.socketId).emit('RTCSendDescription', { offer: payload.offer, sender: socket.id });
  }
  //@UseGuards(RoomMemberGuard)
  @SubscribeMessage('RTCSendCandidate')
  RTCSendCandidate(socket: Socket, payload: { socketId: string; candidate: any }) {
    this.server.to(payload.socketId).emit('RTCSendCandidate', { candidate: payload.candidate, sender: socket.id });
  }
  afterInit() {
    this.logger.log('Init');
  }
  handleDisconnect(socket: Socket) {
    const room = this.roomsService.removeAnyRoom(socket);
    if (!room) return;
    this.server.to(room.id).emit('roomChange', room);
  }
  handleConnection(socket: Socket) {
    console.log(socket.id, config.secret, CryptoJS.AES.encrypt('LOOdpE3Q6RU6DG75AAAA', 'pepis').toString());
    const authKey = CryptoJS.AES.encrypt(socket.id, config.secret).toString();
    this.logger.log(`Client connected: ${socket.id}:${authKey}`);
    this.server.to(socket.id).emit('authorization', authKey);
  }
}
