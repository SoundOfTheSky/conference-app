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

@WebSocketGateway()
export class RoomsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: RoomsService) {}
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');

  @SubscribeMessage('joinRoom')
  joinRoom(socket: Socket, payload: { roomId: string; password: string; username: string; avatar: string }) {
    if (payload.avatar && payload.avatar.length > ((1024 * 1024 * 8) / 3) * 4)
      return { error: 'File size is too big. Must be 8mb or less.' };
    const room = this.roomsService.addToRoom(socket, payload);
    if (!room) return false;
    if (!room.error) this.server.to(room.id).emit('roomChange', room);
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
  changeRoomSettings(socket: Socket, payload: { id: string; name: string; password: string; visible }) {
    const answer = this.roomsService.editRoom(payload.id, payload.name, payload.password, payload.visible);
    if ('error' in answer && answer.error) {
      if (payload.id) this.server.to(payload.id).emit('roomChange', this.roomsService.getRoomForMembers(payload.id));
    } else this.server.to(payload.id).emit('roomChange', answer);
  }
  @SubscribeMessage('RTCSendDescription')
  RTCSendDescription(socket: Socket, payload: { socketId: string; offer: any }) {
    this.server.to(payload.socketId).emit('RTCSendDescription', { offer: payload.offer, sender: socket.id });
  }
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
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
  }
}
