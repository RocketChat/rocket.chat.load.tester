import { Client } from './Client';
import { WebClient } from './WebClient';

export type ClientType = 'web' | 'android' | 'ios';

type ClientByType<T> = T extends 'web' ? WebClient : Client;

export class ClientBase {
  static getClient(host: string, type: ClientType, current: number): ClientByType<typeof type> {
    if (type === 'web') {
      return new WebClient(host, type, current);
    }

    return new Client(host, type, current);
  }
}
