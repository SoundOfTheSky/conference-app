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
    return this.roomsService.addToRoom(socket, payload.roomId, payload.password, payload.username);
  }

  @SubscribeMessage('sendChatMessage')
  sendMessage(client: Socket, payload: { text: string; username: string; roomId: string }): void {
    console.log('sendChatMessage', payload, Object.keys(client.rooms));
    this.server.to(payload.roomId).emit('sendChatMessage', {
      text: payload.text,
      id: this.roomsService.getChatMessageId(),
      username: payload.username,
    });
  }

  @SubscribeMessage('changeRoomSettings')
  changeRoomSettings(socket: Socket, payload: { id: string; name: string; password: string }) {
    console.log('changeRoomSettings');
    this.server
      .to(payload.id)
      .emit('changeRoomSettings', this.roomsService.editRoom(payload.id, payload.name, payload.password));
  }

  afterInit() {
    this.logger.log('Init');
  }

  handleDisconnect(socket: Socket) {
    const room = this.roomsService.removeAnyRoom(socket);
    if (!room) return;
    this.server.to(room.id).emit('changeRoomSettings', room);
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
