# votera-server
Votera Server (Using strapi server)

### Method for Authenticated permission
|Plugin|Name|Method|
|------|----|------|
|Application|Activity|count, find, findOne, summarize|
|Application|Agora|find|
|Application|Feeds|count, find, findone, update|
|Application|Follow|count, createfollow, find, findone, togglefollowall, updatetargetsfollow|
|Application|Interaction|count, create, find, findone, readinteraction, reportedposts, reportpost, |Applicationtogglelike, update|
|Application|Member|all|
|Application|MemberRole|count, find, findone, leaveproposal|
|Application|Post|all|
|Application|Proposal|count, create, find, findbyid, findone, join, update|
|Application|Push|create, update|
|Application|Version|find|
|Upload|Upload|upload|
|Users-Permissions|User|me,update|


### method for Public permission
|Plugin|Name|Method|
|------|----|------|
|Application|Activity|count, find, findone, summarize|
|Application|Agora|find|
|Application|Interaction|count, find, findone|
|Application|Member|checkdupusername, count, createvalidatoruser, find, findone, recovervalidatoruser|
|Application|MemberRole|count, find, findone|
|Application|Post|count, find, findone|
|Application|Version|find|
|Users-Permissions|Auth|callback, connect, emailconfirmation, forgotpassword, register, resetpassword|
|Users-Permissions|User|me|


### Agora 에 저장해야 되는 정보
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
