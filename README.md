# rocket.chat.load.tester

## How to use

```
npm i
npm start
```

## Configurations via environment variables

Env var name | Default value | Description
------------ | ------------- | -------------
`HOST_URL` | `null` | Rocket.Chat URL
`REDIS_HOST` | `redis` | Redis URL
`TRY_REGISTER` | `yes` | Register user if login fails
`HOW_MANY` | `2000` | How many simultaneous connections
`SEATS_PER_ROOM` | `100` | How many users will join each room
`LOGIN_BATCH` | `20` | Simultaneous logins
`MESSAGE_SENDING_RATE` | `0.001428571` | Message sending rate
`ROOM_ID` | `load-test-private-%s` | Room `_id` users will join, listen and send messages
`OPEN_ROOM` | `yes` | Open rooms and listen for messages
`SSL_ENABLED` | `no` | Rocket.Chat server has SSL or not
`LOGIN_OFFSET` | `1` | Initial user number
`INITIAL_LOGIN_OFFSET` | `1` | Initial user number
`SEND_MESSAGES` | `yes` | If connected clients should send messages or not
`CLIENT_TYPE` | `web` | Which client will be simulated (changes the APIs used). Can be: `web`, `android` or `ios`
`USERS_USERNAME` | `test.user.%s` | Username pattern
`USERS_PASSWORD` | "same as username" | Password used to login/register users
`JOIN_ROOM` | `null` | Room _id that users will join
