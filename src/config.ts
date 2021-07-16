import { hash } from './lib/hash';

const {
  // HOW_MANY = '100',
  HOW_MANY_USERS = '100',
  USERS_PER_ROOM = '10',
  LOGIN_BATCH = '10',
  USERS_USERNAME = 'tester-%s',
  USERS_PASSWORD = 'tester-%s',
  USERS_EMAIL = '@domain.com',
  SUBSCRIPTION_ID = 'sib-__rid__-__uid__',
  ROOM_ID = 'rid-__prefix__-__count__',
  USER_ID = 'uid-__prefix__-__count__',
  TASK_ID = '1',
  DATABASE_URL = '', // 'mongodb://localhost:27017';
  MESSAGES_PER_SECOND = '20',
  MESSAGE_SENDING_RATE, // ='0.001428571,
  CLUSTER_GROUP = 'loadtester',
} = process.env;

export const config = {
  // HOW_MANY,
  HOW_MANY_USERS: parseInt(HOW_MANY_USERS),
  USERS_PER_ROOM,
  USERS_USERNAME,
  DATABASE_URL,
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
    TASK_ID,
    CLUSTER_GROUP,
    version: '1.0.0',
  }),
  MESSAGES_PER_SECOND: MESSAGE_SENDING_RATE
    ? Math.ceil(parseInt(HOW_MANY_USERS) * parseFloat(MESSAGE_SENDING_RATE))
    : parseInt(MESSAGES_PER_SECOND),
  SUBSCRIPTION_ID,
  ROOM_ID,
  USER_ID,
  TASK_ID,
  CLUSTER_GROUP,
};
