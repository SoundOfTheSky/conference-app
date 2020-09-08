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
  joinRoom(client: Socket, payload: { roomId: string; password: string; peer: string }) {
    return this.roomsService.addToRoom(payload.roomId, payload.password, client, payload.peer);
  }
  @SubscribeMessage('sendMessage')
  sendMessage(client: Socket, payload: { message: string; roomId: string }): void {
    client.to(payload.roomId).emit('sendMessage', payload.message);
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
