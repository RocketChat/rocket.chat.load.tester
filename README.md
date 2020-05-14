# rocket.chat.load.tester

## Requirements

Node v10

## How to use

```
npm i
npm start
```

## Configurations via environment variables

Env var name | Default value | Description
------------ | ------------- | -------------
`HOST_URL` | `localhost:3000` | Rocket.Chat URL
`PORT` | `3000` | The port this service will listen to
`DISABLE_STANDALONE` | `null` | If it should perform actions
`REDIS_HOST` | `redis` | Redis URL
`TRY_REGISTER` | `yes` | Register user if login fails
`HOW_MANY` | `1` | How many simultaneous connections
`SEATS_PER_ROOM` | `null` | How many users will join each room
`LOGIN_BATCH` | `10` | Simultaneous logins
`MESSAGE_SENDING_RATE` | `0.002857142857143` | Message sending rate
`ROOM_ID` | `GENERAL` | Room `_id` users will join, listen and send messages
`OPEN_ROOM` | `yes` | Open rooms and listen for messages
`SSL_ENABLED` | `no` | Rocket.Chat server has SSL or not
`LOGIN_OFFSET` | `1` | Initial user number
`INITIAL_LOGIN_OFFSET` | `1` | Initial user number
`SEND_MESSAGES` | `yes` | If connected clients should send messages or not
`CLIENT_TYPE` | `web` | Which client will be simulated (changes the APIs used). Can be: `web`, `android` or `ios`
`USERS_USERNAME` | `tester-%s` | Username pattern
`USERS_PASSWORD` | `tester-%s` | Password used to login/register users
`USERS_EMAIL` | `tester-%s@domain.com` | User's email used to register
`JOIN_ROOM` | `null` | Room _id that users will join
`LOG_IN` | `yes` | If clients should log in or just connect
