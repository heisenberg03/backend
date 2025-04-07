import { MercuriusContext } from 'mercurius';
import { UserService } from '../services/userService';

declare module 'mercurius' {
  interface MercuriusContext {
    db: import('pg').Pool;
    logger: import('pino').Logger;
    userService: UserService;
    user?: { id: string; username: string; isArtist: boolean };
    headers: any;
  }
}