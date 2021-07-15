import { Client } from './Client';
import { WebClient } from './WebClient';

export type ClientType = 'web' | 'android' | 'ios';

export class ClientBase {
  static getClient(host: string, type: ClientType, current: number): Client {
    if (type === 'web') {
      return new WebClient(host, type, current);
    }

    return new Client(host, type, current);
  }
}
