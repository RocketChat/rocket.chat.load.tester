import PromisePool from '@supercharge/promise-pool';

import { Client } from '../client/Client';
import { ClientBase } from '../client/ClientBase';
import { WebClient } from '../client/WebClient';
import { config } from '../config';

const {
  CLIENT_TYPE = 'web',
  // USERS_USERNAME = 'tester-%s',
  // USERS_PASSWORD = 'tester-%s',
  // USERS_EMAIL = 'tester-%s@domain.com',
  HOST_URL = 'https://bench.rocket.chat',
  // MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

export const getClients = async (size: number): Promise<(Client | WebClient)[]> => {
  const users = Array.from({ length: size }).map((_, i) => i);

  console.log('Logging in', size, 'users');

  const { results } = await PromisePool.withConcurrency(config.LOGIN_BATCH)
    .for(users)
    .handleError((error) => {
      throw error;
    })
    .process(async (index) => {
      try {
        const client = ClientBase.getClient(
          HOST_URL,
          CLIENT_TYPE as 'web' | 'android' | 'ios',
          index as number
        );

        // await client.login();

        return client;
      } catch (error) {
        console.error('Error during log in', error);
        throw error;
      }
    });

  return results;
};
