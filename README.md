# rocket.chat.load.tester

## How to use

Run it and then consume its REST API:

```
# spawn as many clients you want/can
curl -X POST http://localhost:3000/load/connect -d 'howMany=100'

# log them in
curl -X POST http://localhost:3000/load/login

# subscribe to receive room's messages and events
curl -X POST http://localhost:3000/load/subscribe/GENERAL

# start sending messages
curl -X POST http://localhost:3000/load/message/send

# stop sending messages
curl -X DELETE http://localhost:3000/load/message/send
