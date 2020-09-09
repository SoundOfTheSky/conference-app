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
    console.log('sendChatMessage', payload);
    client.to(payload.roomId).emit('sendChatMessage', {
      text: payload.text,
      id: this.roomsService.getChatMessageId(),
      username: payload.username,
    });
  }

  afterInit(server: Server) {
    this.logger.log('Init');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
