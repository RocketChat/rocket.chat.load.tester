import client from 'prom-client';

client.collectDefaultMetrics({
  prefix: 'load_tester',
});

// TODO: add label with instance

export const connected = new client.Gauge({
  name: 'rc_load_connected',
  help: 'Connected clients',
});
export const login = new client.Summary({
  name: 'rc_load_login',
  help: 'Users logged in',
  labelNames: ['status'],
});
export const register = new client.Summary({
  name: 'rc_load_register',
  help: 'User registered',
  labelNames: ['status'],
});
export const messages = new client.Summary({
  name: 'rc_load_messages',
  help: 'Messages sent',
  labelNames: ['status'],
});
export const roomJoin = new client.Summary({
  name: 'rc_load_room_join',
  help: 'Room join event',
  labelNames: ['status'],
});
export const roomSubscribe = new client.Summary({
  name: 'rc_load_room_subscribe',
  help: 'Room subscribe event',
  labelNames: ['status'],
});
export const openRoom = new client.Summary({
  name: 'rc_load_open_room',
  help: 'Open room sction',
  labelNames: ['status'],
});

export default client;

export { client };
