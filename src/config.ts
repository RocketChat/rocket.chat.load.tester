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
  MESSAGES_PER_SECOND = '10',
  MESSAGE_SENDING_RATE = '0.00115428571', // ='0.001428571,

  SET_STATUS_PER_SECOND = '0',
  SET_STATUS_RATE = '0.000115428571',

  REGISTER_PER_SECOND = '0',
  REGISTER_RATE = '0.000115428571',

  OPEN_ROOM_PER_SECOND = '0',
  OPEN_ROOM_RATE = '0.000115428571',

  READ_MESSAGE_PER_SECOND = '0',
  READ_MESSAGE_RATE = '0.000115428571',

  LOGIN_PER_SECOND = '0',
  LOGIN_RATE = '0.000115428571',

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
  LOGIN_BATCH: parseInt(LOGIN_BATCH),
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
  SUBSCRIPTION_ID,
  ROOM_ID,
  USER_ID,
  TASK_ID: String(TASK_ID || net || '1'),
  CLUSTER_GROUP,
  IGNORE_ROOMS: IGNORE_ROOMS.split(','),

  MESSAGES_PER_SECOND: MESSAGE_SENDING_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(MESSAGE_SENDING_RATE)
    : parseInt(MESSAGES_PER_SECOND),

  SET_STATUS_PER_SECOND: SET_STATUS_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(SET_STATUS_RATE)
    : parseInt(SET_STATUS_PER_SECOND),

  REGISTER_PER_SECOND: REGISTER_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(REGISTER_RATE)
    : parseInt(REGISTER_PER_SECOND),

  OPEN_ROOM_PER_SECOND: OPEN_ROOM_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(OPEN_ROOM_RATE)
    : parseInt(OPEN_ROOM_PER_SECOND),

  READ_MESSAGE_PER_SECOND: READ_MESSAGE_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(READ_MESSAGE_RATE)
    : parseInt(READ_MESSAGE_PER_SECOND),

  LOGIN_PER_SECOND: LOGIN_RATE
    ? parseInt(HOW_MANY_USERS) * parseFloat(LOGIN_RATE)
    : parseInt(LOGIN_PER_SECOND),
};
