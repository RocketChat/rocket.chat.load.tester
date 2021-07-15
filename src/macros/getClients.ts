import PromisePool from '@supercharge/promise-pool';

import { Client } from '../client/Client';
import { ClientBase } from '../client/ClientBase';
import { config } from '../config';
import { progress, addTask } from '../progress';

const {
  CLIENT_TYPE = 'web',
  // USERS_USERNAME = 'tester-%s',
  // USERS_PASSWORD = 'tester-%s',
  // USERS_EMAIL = 'tester-%s@domain.com',
  HOST_URL = 'https://bench.rocket.chat',
  // MESSAGE_SENDING_RATE = 0.002857142857143,
} = process.env;

const login = addTask('Login', progress);

export const getClients = async (size: number): Promise<Client[]> => {
  const users = Array.from({ length: size }).map((_, i) => i);
  const { results } = await PromisePool.withConcurrency(
    parseInt(config.LOGIN_BATCH)
  )
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

        await client.login();
        login.incrementTask({
          percentage: 1 / users.length,
        });

        return client;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

  return results;
};
