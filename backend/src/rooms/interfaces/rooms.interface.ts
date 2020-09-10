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

export interface ErrorMessage {
  error?: string;
}
export interface roomForUsers {
  id: string;
  name: string;
  visible: boolean;
  needPassword: boolean;
}
export interface roomForMembers {
  id: string;
  name: string;
  password: string;
  visible: boolean;
  members: {
    userId: string;
    username: string;
    socketId: string;
  }[];
}
export type Response<T> = (T & Partial<ErrorMessage>) | (Partial<T> & ErrorMessage);
