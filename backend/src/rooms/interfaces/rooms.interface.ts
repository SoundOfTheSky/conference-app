import { Socket } from 'socket.io';
export interface Room {
  id: string;
  name: string;
  password: string;
  visible: boolean;
  members: {
    username: string;
    socket: Socket;
    avatar: string;
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
    username: string;
    socketId: string;
    avatar: string;
  }[];
}
export type Response<T> = (T & Partial<ErrorMessage>) | (Partial<T> & ErrorMessage);
