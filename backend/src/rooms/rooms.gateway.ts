import { RoomsService } from './rooms.service';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway(80)
export class RoomsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: RoomsService) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');

  @SubscribeMessage('joinRoom')
  joinRoom(socket: Socket, payload: { roomId: string; password: string; username: string }) {
    const room = this.roomsService.addToRoom(socket, payload.roomId, payload.password, payload.username);
    if (!room) return false;
    this.server.to(room.id).emit('roomChange', room);
    return room;
  }

  @SubscribeMessage('sendChatMessage')
  sendMessage(client: Socket, payload: { text: string; username: string; roomId: string }): void {
    this.server.to(payload.roomId).emit('sendChatMessage', {
      text: payload.text,
      id: this.roomsService.getChatMessageId(),
      username: payload.username,
    });
  }

  @SubscribeMessage('changeRoomSettings')
  changeRoomSettings(socket: Socket, payload: { id: string; name: string; password: string }) {
    this.server
      .to(payload.id)
      .emit('roomChange', this.roomsService.editRoom(payload.id, payload.name, payload.password));
  }
  @SubscribeMessage('RTCSendDescription')
  RTCSendDescription(socket: Socket, payload: { id1: string; id2: string; roomId: string; offer: any }) {
    const room = this.roomsService.getRoomForMembers(payload.roomId);
    if (!room) return false;
    const member = room.members.find(member => member.userId === payload.id2);
    if (!member) return false;
    this.server
      .to(member.socketId)
      .emit('RTCSendDescription', { offer: payload.offer, id1: payload.id1, id2: payload.id2 });
  }
  @SubscribeMessage('RTCSendCandidate')
  RTCSendCandidate(socket: Socket, payload: { id1: string; id2: string; roomId: string; dir: number; candidate: any }) {
    const room = this.roomsService.getRoomForMembers(payload.roomId);
    if (!room) return false;
    const member = room.members.find(member => member.userId === payload.id2);
    if (!member) return false;
    this.server
      .to(member.socketId)
      .emit('RTCSendCandidate', { candidate: payload.candidate, id1: payload.id1, id2: payload.id2, dir: payload.dir });
  }
  afterInit() {
    this.logger.log('Init');
  }

  handleDisconnect(socket: Socket) {
    const room = this.roomsService.removeAnyRoom(socket);
    if (!room) return;
    this.server.to(room.id).emit('roomChange', room);
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
