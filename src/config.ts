import { networkInterfaces } from 'os';

import { hash } from './lib/hash';

const nets = Object.values(networkInterfaces()).flatMap((net) => net);

const net = nets
  .map((net) => net && net.family === 'IPv4' && !net.internal && net.address)
  .filter(Boolean)[0];

const {
  // HOW_MANY = '100',
  IGNORE_ROOMS = 'GENERAL',
  HOW_MANY_USERS = '500',
  USERS_PER_ROOM = '10',
  LOGIN_BATCH = '10',
  USERS_USERNAME = 'tester-%s',
  USERS_PASSWORD = 'tester-%s',
  USERS_EMAIL = '@domain.com',
  SUBSCRIPTION_ID = 'sib-__rid__-__uid__',
  ROOM_ID = 'rid-__prefix__-__count__',
  USER_ID = 'uid-__prefix__-__count__',
  TASK_ID,
  DATABASE_URL = '', // 'mongodb://localhost:27017';
  DATABASE_NAME = 'rocketchat',
  MESSAGES_PER_SECOND = '20',
  MESSAGE_SENDING_RATE, // ='0.001428571,
  CLUSTER_GROUP = 'loadtester',
  MESSAGE = 'hello',
} = process.env;

export const config = {
  // HOW_MANY,
  HOW_MANY_USERS: parseInt(HOW_MANY_USERS),
  USERS_PER_ROOM,
  USERS_USERNAME,
  DATABASE_URL,
  DATABASE_NAME,
  USERS_PASSWORD,
  USERS_EMAIL,
  LOGIN_BATCH,
  hash: hash({
    HOW_MANY_USERS,
    USERS_PER_ROOM,
    USERS_USERNAME,
    USERS_PASSWORD,
    USERS_EMAIL,
    SUBSCRIPTION_ID,
    ROOM_ID,
    USER_ID,
    TASK_ID: String(TASK_ID || net || '1'),
    CLUSTER_GROUP,
    version: '1.0.0',
  }),
  MESSAGE,
  MESSAGES_PER_SECOND: MESSAGE_SENDING_RATE
    ? Math.ceil(parseInt(HOW_MANY_USERS) * parseFloat(MESSAGE_SENDING_RATE))
    : parseInt(MESSAGES_PER_SECOND),
  SUBSCRIPTION_ID,
  ROOM_ID,
  USER_ID,
  TASK_ID: String(TASK_ID || net || '1'),
  CLUSTER_GROUP,
  IGNORE_ROOMS: IGNORE_ROOMS.split(','),
};
