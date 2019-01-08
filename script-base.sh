LOADTEST01=QTTTXhs4jiiwrY5h9
LOADTEST02=YpZnf5K8RXEYuNLr8
LOADTEST03=8FY5BToGewBNZfdEa
LOADTEST04=hNctfhrYZDbBaKm5e

curl -X POST http://localhost:3001/load/connect -d 'howMany=300'
curl -X POST http://localhost:3002/load/connect -d 'howMany=300'
curl -X POST http://localhost:3003/load/connect -d 'howMany=300'
curl -X POST http://localhost:3060/load/connect -d 'howMany=300'
curl -X POST http://localhost:3070/load/connect -d 'howMany=300'
curl -X POST http://localhost:3080/load/connect -d 'howMany=300'
curl -X POST http://localhost:3090/load/connect -d 'howMany=300'
curl -X POST http://localhost:4010/load/connect -d 'howMany=300'
curl -X POST http://localhost:4020/load/connect -d 'howMany=300'
curl -X POST http://localhost:4030/load/connect -d 'howMany=300'

curl -X POST http://localhost:3001/load/login -d 'batchSize=5&offset=0'
curl -X POST http://localhost:3002/load/login -d 'batchSize=5&offset=300'
curl -X POST http://localhost:3003/load/login -d 'batchSize=5&offset=600'
curl -X POST http://localhost:3060/load/login -d 'batchSize=5&offset=900'
curl -X POST http://localhost:3070/load/login -d 'batchSize=5&offset=1200'
curl -X POST http://localhost:3080/load/login -d 'batchSize=5&offset=1500'
curl -X POST http://localhost:3090/load/login -d 'batchSize=5&offset=1800'
curl -X POST http://localhost:4010/load/login -d 'batchSize=5&offset=2100'
curl -X POST http://localhost:4020/load/login -d 'batchSize=5&offset=2400'
curl -X POST http://localhost:4030/load/login -d 'batchSize=5&offset=2700'

curl -X POST http://localhost:3001/load/join/$LOADTEST01
curl -X POST http://localhost:3002/load/join/$LOADTEST01
curl -X POST http://localhost:3003/load/join/$LOADTEST01
curl -X POST http://localhost:3060/load/join/$LOADTEST01

curl -X POST http://localhost:3001/load/join/$LOADTEST02
curl -X POST http://localhost:3002/load/join/$LOADTEST02
curl -X POST http://localhost:3003/load/join/$LOADTEST02
curl -X POST http://localhost:3060/load/join/$LOADTEST02

curl -X POST http://localhost:3001/load/join/$LOADTEST03
curl -X POST http://localhost:3002/load/join/$LOADTEST03
curl -X POST http://localhost:3003/load/join/$LOADTEST03
curl -X POST http://localhost:3060/load/join/$LOADTEST03

curl -X POST http://localhost:3001/load/join/$LOADTEST04
curl -X POST http://localhost:3002/load/join/$LOADTEST04
curl -X POST http://localhost:3003/load/join/$LOADTEST04
curl -X POST http://localhost:3060/load/join/$LOADTEST04

curl -X POST http://localhost:3001/load/open-room/$LOADTEST01
curl -X POST http://localhost:3002/load/open-room/$LOADTEST02
curl -X POST http://localhost:3003/load/open-room/$LOADTEST03
curl -X POST http://localhost:3060/load/open-room/$LOADTEST04
curl -X POST http://localhost:3070/load/open-room/$LOADTEST01
curl -X POST http://localhost:3080/load/open-room/$LOADTEST02
curl -X POST http://localhost:3090/load/open-room/$LOADTEST03
curl -X POST http://localhost:4010/load/open-room/$LOADTEST04
curl -X POST http://localhost:4020/load/open-room/$LOADTEST01
curl -X POST http://localhost:4030/load/open-room/$LOADTEST02

curl -X POST http://localhost:3001/load/message/send/$LOADTEST01
curl -X POST http://localhost:3002/load/message/send/$LOADTEST02
curl -X POST http://localhost:3003/load/message/send/$LOADTEST03
curl -X POST http://localhost:3060/load/message/send/$LOADTEST04
curl -X POST http://localhost:3070/load/message/send/$LOADTEST01
curl -X POST http://localhost:3080/load/message/send/$LOADTEST02
curl -X POST http://localhost:3090/load/message/send/$LOADTEST03
curl -X POST http://localhost:4010/load/message/send/$LOADTEST04
curl -X POST http://localhost:4020/load/message/send/$LOADTEST01
curl -X POST http://localhost:4030/load/message/send/$LOADTEST02

curl -X DELETE http://localhost:3001/load/message/send
curl -X DELETE http://localhost:3002/load/message/send
curl -X DELETE http://localhost:3003/load/message/send
curl -X DELETE http://localhost:3060/load/message/send
