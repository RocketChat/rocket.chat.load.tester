import { hash } from './lib/hash';

const {
  // HOW_MANY = '100',
  HOW_MANY_USERS = '400',
  USERS_PER_ROOM = '10',
  LOGIN_BATCH = '10',
  USERS_USERNAME = 'tester-%s',
  USERS_PASSWORD = 'tester-%s',
  USERS_EMAIL = '@domain.com',
  SUBSCRIPTION_ID = 'sib-__rid__-__uid__',
  ROOM_ID = 'rid-__prefix__-__count__',
  USER_ID = 'uid-__prefix__-__count__',
  DATABASE_URL = '', // 'mongodb://localhost:27017';
} = process.env;

export const config = {
  // HOW_MANY,
  HOW_MANY_USERS,
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
    // LOGIN_BATCH,
    SUBSCRIPTION_ID,
    ROOM_ID,
    USER_ID,
    // version: 111223,
  }),
  SUBSCRIPTION_ID,
  ROOM_ID,
  USER_ID,
};
