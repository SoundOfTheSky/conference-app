import { Socket } from 'socket.io';
export interface Room {
  readonly id: string;
  readonly name: string;
  readonly password: string;
  readonly members: {
    readonly userId: string;
    readonly username: string;
    readonly socket: Socket;
  }[];
}
