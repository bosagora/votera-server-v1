# installation

votera server is using strapi with node server
it requires version 14 or later.

Required module and package
1. mongodb : used as database
2. redis : used for pubsub and redlock
3. s3 : used as file upload repository


configuration location and list 

1. mongodb

config location: config/database.js

reference [strapi database configuration](https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#database)

- connections List of all available connections.
  - default
    - connector (string): Connector used by the current connection. Will be mongoose.
    - settings Useful for external session stores such as Redis.
      - client (string): Database client to create the connection. Will be mongo.
      - host (string): Database host name. Default value: localhost.
      - port (integer): Database port. Default value: 27017.
      - database (string): Database name.
      - username (string): Username used to establish the connection.
      - password (string): Password used to establish the connection.
      - uri (string): This can overide all previous configurations - optional
    - options Options used for database connection.
      - ssl (boolean): For ssl database connection.
      - sslCA (string): Pass content (not filepath!) of server's root CA for ssl    connection.
      - debug (boolean): Show database exchanges and errors.
      - authenticationDatabase (string): Connect with authentication.



2. redis (pubsub)

config location : config/pubsub.js

- service
  - enable : enable/disable pubsub 
  - endpoint: url of pubsub
- redis (redis configuration for pubsub feature)
  - enable : enable/disable redis use for pubsub
  - options
    - host : redis host 
    - port : redis port
    - username : username for redis connection
    - password : password for redis connection

3. redis (cron redlock) and others for server

config location:  config/server.js

- host: service ip of strapi server
- port: listening port of strapi server
- contact: 
  - support: support contact information
- cron: cron configuration
  - enabled: enable/disable cron service
  - redis: configuration for cron redlock
    - enable: enable/disable for redis for cron
    - options: cron redlock connection information
      - host : redis host
      - port : redis port
      - username : username for redis connection
      - password : password for redis connection
  - ttl: ttl (time to live) configuration of redlock

4. s3 (upload configuration)

config location : config/plugins.js

can use other upload provider of strapi

[Strapi upload](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#models-definition)

- upload : Upload plugin configuration
  - provider : Upload plugin name
  - providerOptions: 
    - accessKeyId : S3 Access Key ID
    - secretAccessKey : S3 Secret Access Key
    - region : S3 service region
    - params
      - Bucket : S3 Service bucket

5. Bosagora configuration

config location: config/boaclient.js

Agora and Sto configuration for Blockchain access

- sto
  - url : sto server url
  - port : sto server port
- agora
  - url : agora url
  - port : agora port
- service
  - vote_-_payload_size : current payload size for vote

# votera-server
Votera Server (Using strapi server)


### Method for Authenticated permission

|Plugin|Name|Method|
|------|----|------|
|Application|Activity|count, find, findOne, summarize|
|Application|Agora|find|
|Application|Feeds|count, find, findone, update|
|Application|Interaction|reportedposts, reportpost, togglelike|
|Application|Member|all|
|Application|MemberRole|count, find, findone|
|Application|Post|count, create, find, findone, listposts, update|
|Application|Proposal|count, create, find, findbyid, findone, findvotera, join|
|Application|Version|find|
|Upload|Upload|upload|
|Users-Permissions|Auth|connect|
|Users-Permissions|User|me,updatepassword, updateuseralarmstatus, updateuserpushtoken|


### method for Public permission
|Plugin|Name|Method|
|------|----|------|
|Application|Activity|count, find, findone, summarize|
|Application|Agora|find|
|Application|Interaction|reportedposts|
|Application|Member|checkdupusername, count, createvalidatoruser, find, findone, recovervalidatoruser|
|Application|MemberRole|count, find, findone|
|Application|Post|count, find, findone|
|Application|Proposal|count, find, findbyid, findone, findvotera|
|Application|Version|find|
|Users-Permissions|Auth|callback, connect, emailconfirmation, forgotpassword, register, resetpassword|
|Users-Permissions|User|me|

### method for Tester permission
|Plugin|Name|Method|
|------|----|------|
|Users-Permissions|Auth|callback, connect, emailconfirmation, forgotpassword, register, resetpassword|
|Users-Permissions|User|me|
|Application|Proposal|testcreate|

### Agora 
|Field|Description|
|-----|-----------|
|PrivacyTermUrl|개인정보보호 약관 URL|
|UserSErviceTermUrl|사용자이용 약관 URL|
|VoteResultUrl|투표 결과를 보여주는 URL|
|ProposalFeeAddress|Proposal Fee 를 받을 Address |
|ProposalFeeRatio|Proposal Fee 비율 (기본값 0.01)|


### .env 설정 정보
|Name|Description|
|----|-----------|
|HOST|binding 할 서버 주소|
|PORT|서비스 포트|
|DATABASE_HOST|mongodb host|
|DATABASE_PORT|mongodb port|
|DATABASE_NAME|mongodb database name|
|DATABASE_USERNAME|mongodb connect username|
|DATABASE_PASSWORD|mongodb connect password|
|AUTHENTICATION_DATABASE|mongodb authentication database|
|PUBSUB_ENABLE|pubsub 기능 on/off|
|PUBSUB_ENDPOINT|pubsub endpoint url|
|PUBSUB_REDIS_ENABLE|redis를 이용한 pubsub on/off|
|PUBSUB_REDIS_HOST|redis를 이용한 pubsub 일 경우 REDIS host|
|PUBSUB_REDIS_PORT|redis를 이용한 pubsub 일 경우 REDIS port|
|PUBSUB_REDIS_USERNAME|redis 접속시 username|
|PUBSUB_REDIS_PASSWORD|redis 접속 시 password|
|CRON_REDIS_ENABLE|redlock를 이용한 cron batch job control on/off|
|CRON_REDIS_HOST|redlock 이용할 경우 redis host|
|CRON_REDIS_PORT|redlock 이용할 경우 redis port|
|CRON_REDIS_USERNAME|redlock 이용할 경우 redis username|
|CRON_REDIS_PASSWORD|redlock 이용할 경우 redis password|
|AWS_S3_ACCESS_KEY_ID|AWS S3 Access Key|
|AWS_S3_SECRET_ACCESS_KEY|AWS S3 access secret key|
|AWS_S3_REGION|AWS S3 region|
|AWS_S3_BUCKET|AWS S3 bucket|
|STOA_URL|Stoa server url|
|STOA_PORT|stoa server port|
|AGORA_URL|Agora server url|
|AGORA_PORT|Agora server port|


### 수동으로 색인 추가

posts
{
    "createdAt": 1
}

proposals
{
    "createdAt": 1
}

interactions
{
    "type": 1,
    "post": 1,
    "user": 1
},
{
    "type": 1,
    "proposal": 1,
    "user": 1
}
