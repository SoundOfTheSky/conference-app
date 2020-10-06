import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import AES from 'crypto-js/aes';
import config from '../config';
@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(private readonly roomsService: RoomsService) {}
  canActivate(context: ExecutionContext) {
    console.log(context);
    const request = context.switchToHttp().getRequest();
    console.log(request);
    //this.roomsService.findUsersRoom(AES.decrypt(request.cookie.authorization, config.secret));
    return true;
  }
}
