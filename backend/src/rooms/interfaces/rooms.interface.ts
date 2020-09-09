import { Socket } from 'socket.io';
export interface Room {
  id: string;
  name: string;
  password: string;
  visible: boolean;
  members: {
    userId: string;
    username: string;
    socket: Socket;
  }[];
}
