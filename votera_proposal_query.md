## 1. 스키마 확인

접속 URL : http://dev-votera.bosagora.com:1337/graphql

Graphql Doc 확인 가능

## 2. Login

Graphql 일 경우

```javascript
mutation {
  login(input: {
    identifier: "votera@abowa.io",
    password: "123456"
  }){
    jwt
  }
}
```

REST API 인 경우

```
POST /auth/local
```

Request body
|Param|Description|
|-----|-----------|
|identifier|사용자 ID (ex) votera@abowa.io|
|password|사용자 암호 (ex) 123456|
|

Response body (JSON)

```
{
  jwt: String # JWT Token (인증 성공 시)
  user: Object # 사용자 객체
}
```


**이후 부터는 헤더에 Authorization 필요**

```javascript
{
 "Authorization": "Bearer ${2번에서 얻은 jwt 값}"
}
```


## 3. Query

### 3.0 Type

- 제안 유형 TYPE (ENUM_PROPOSAL_TYPE)

|value|설명|
|---------|----|
|SYSTEM|시스템제안|
|BUSINESS|사업제안|
|

```
enum ENUM_PROPOSAL_TYPE {
  SYSTEM
  BUSINESS
}
```

- 현재 제안 상태 (ENUM_PROPOSAL_STATUS)

|value|설명|
|---|----|
|PENDING_ASSESS|사전평가 전 proposal FEE 입금대기 상태|
|ASSESS|사전평가 중|
|PENDING_VOTE|투표 전 vote FEE 입금대기 상태|
|VOTE|투표 중|
|REJECT|사전평가 결과 REJECT (deprectated 사용안함)|
|CANCEL|취소됨 (FEE 미입금)|
|DELETED|삭제됨 (deprecated 사용안함)|
|CLOSED|투표완료|
|

```
enum ENUM_PROPOSAL_STATUS {
  PENDING_ASSESS
  ASSESS
  PENDING_VOTE
  VOTE
  REJECT
  CANCEL
  DELETED
  CLOSED
}
```

- 일자 정보 (ComponentCommonPeriod)

|KEY|설명|
|---|----|
|begin|시작일|
|end|종료일|
|

```
type ComponentCommonPeriod {
  id: ID!
  _id: ID!
  begin: Date!
  end: Date!
}
```

- 파일 정보 (UploadFile)

|KEY|설명|
|---|----|
|createdAt|생성일자|
|updatedAt|갱신일자|
|name|파일이름|
|width|이미지 가로|
|height|이미지 세로|
|hash|파일이름의 hash tag|
|ext|파일 확장자|
|mime|파일 종류 (mime)|
|size|파일 사이즈 (bytes)
|url|파일 URL|
|provider|파일 저장 방식 (AWS-S3)|
|doc_hash|파일의 SHA256 Hash (hex)|
|

```
type UploadFile {
  id: ID!
  _id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  alternativeText: String
  caption: String
  width: Int
  height: Int
  formats: JSON
  hash: String!
  ext: String
  mime: String!
  size: Float!
  url: String!
  previewUrl: String
  provider: String!
  provider_metadata: JSON
  doc_hash: String
  related(sort: String, limit: Int, start: Int, where: JSON): [Morph]
}
```

- 제안 (Proposal)

|KEY|설명|
|---|----|
|createdAt|생성일자|
|updatedAt|갱신일자|
|name|제안 제목|
|description|제안 사업목표 및 설명|
|type|제안 유형|
|status|현재 제안 상태|
|fundingAmount|제안 요청 금액 (BOA 소숫점7자리 포함) 1 BOA = 10000000|
|proposalId|제안서 ID (Block에 저장되는 ID)|
|logo|제안 대표 이미지|
|creator|제안 생성자|
|assessPeriod|사전평가 기간|
|votePeriod|투표 기간|
|proposal_address|제안자 입금 주소 (funding 금액을 입금받을 주소)|
|proposal_fee_address|제안 fee 입금 주소 (proposal fee 입금 주소)|
|proposal_fee|제안 fee (수수료)|
|tx_hash_proposal_fee|transaction hash of proposal fee|
|vote_start_height|투표 시작 block height|
|vote_end_height|투표 종료 block height|
|doc_hash|제안 hash|
|vote_fee|제안 투표 fee|
|tx_hash_vote_fee|transaction hash of vote fee|
|validators|validator 목록 (JSON array of string)|
|attachment|첨부 파일|
|

```
type Proposal {
  id: ID!
  _id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  description: String
  type: ENUM_PROPOSAL_TYPE!
  status: ENUM_PROPOSAL_STATUS!
  fundingAmount: String
  proposalId: String
  logo: UploadFile
  creator: Member
  assessPeriod: ComponentCommonPeriod
  votePeriod: ComponentCommonPeriod
  proposer_address: String
  proposal_fee_address: String
  proposal_fee: String
  tx_hash_proposal_fee: String
  vote_start_height: Int
  vote_end_height: Int
  doc_hash: String
  vote_fee: String
  tx_hash_vote_fee: String
  validators: String
  proposal_begin: Int
  member_count: Int!
  timeAlarm_notified: Boolean
  attachment(sort: String, limit: Int, start: Int, where: JSON): [UploadFile]
  activities(sort: String, limit: Int, start: Int, where: JSON): [Activity]
  roles(sort: String, limit: Int, start: Int, where: JSON): [MemberRole]
  interactions(sort: String, limit: Int, start: Int, where: JSON): [Interaction]
}
```

주의 할 점은 여기의 ID는 mongo db의 id입니다.
일반적인 조회에서는 mongo db의 id를 사용하고, 12자리로 정의된 proposal_id 로 조회하는 것은 아래에 따로 Query가 정의되어 있다.

### 3.1 전체 proposal query

Graphql로 조회하는 경우

```javascript
query {
  proposals {
    id
    proposalId
    name
    description
    type
    status
    assessPeriod {
      begin
      end
    }
    votePeriod {
      begin
      end
    }
    fundingAmount
    proposer_address
    logo {
      url
      name
      mime
      size
      doc_hash
    }
    attachment {
      url
      name
      mime
      size
      doc_hash
    }
  }
}
```

REST API 로 조회하는 경우

```
GET /proposals
```

Request Parameter

참조 : https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#api-parameters

- _start : Skip a specific number of entries (especially useful for pagination)
- _limit : Limit the size of the returned results. (default limit 100)

```
example
GET /proposals?_start=10&_limit=10
```

- _sort : Sort according to a specific field.

```
example:
ASC: GET /proposals?_sort=name:ASC
DESC: GET /proposals?_sort=name:DESC
sorting on multiple fields
GET /proposals?_sort=name:ASC,createdAt:DESC
```

- Filters
  - proposalId=123123 : Equal
  - proposalId_eq=123123 : Equal
  - proposalId_ne=123123 : Not Equal
  - proposalId_in=['123123','234234'] : Include in an array
  - proposalId_nin=['123123','234234'] : not included in an array
  - proposalId_lt=123123 : less than
  - proposalId_lte=123123 : less than or equal to
  - proposalId_gt=123123 : greater than
  - proposalId_gte=123123 : reater than or equal to

Response body (JSON)

array of Proposal object (defined 3.0)


### 3.2 특정 proposal query

Graphql 로 조회할 경우 

```javascript
query {
	voteraProposal(proposalId: "414256661126") {
    id
    proposalId
    name
    description
    type
    status
    assessPeriod {
      begin
      end
    }
    votePeriod {
      begin
      end
    }
    assessResult {
      average
      nodeCount
      completeness
      realization
      profitability
      attractiveness
      expansion
    }
    fundingAmount
    proposal_address
    logo {
      url
      name
      mime
      size
      doc_hash
    }
    attachment {
      url
      name
      mime
      size
      doc_hash
    }
  }
}
```

REST API 로 조회하는 경우

```
GET /votera-proposal/:_proposalId

proposalId 414256661126 인 제안을 조회하는 경우

GET /votera-proposal/414256661126
```

response body (JSON)

VoteraProposal 객체 (Proposal 객체에 AssessResult 결과 추가)

- 사전 투표 결과 (AssessResult)

|KEY|설명|
|---|----|
|average|점수 평균|
|nodeCount|참여 노드 갯수|
|completeness|제안완성도|
|realization|실현가능성|
|profitability|수익성|
|attractiveness|매력도|
|expansion|확장가능성|
|

```
type AssessResult {
  average: Float
  nodeCount: Int
  completeness: Float
  realization: Float
  profitability: Float
  attractiveness: Float
  expansion: Float
}
```

- VoteraProposal 

Proposal type 에 assessResult 추가

```
type VoteraProposal {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  name: String!
  description: String
  type: ENUM_PROPOSAL_TYPE
  status: ENUM_PROPOSAL_STATUS
  fundingAmount: String
  proposalId: String!
  logo: UploadFile
  assessPeriod: ComponentCommonPeriod
  votePeriod: ComponentCommonPeriod
  proposal_address: String
  proposal_fee_address: String
  proposal_fee: String
  tx_hash_proposal_fee: String
  vote_start_height: Int
  vote_end_height: Int
  doc_hash: String
  vote_fee: String
  tx_hash_vote_fee: String
  validators: String
  proposal_begin: Int
  attachment: [UploadFile]
  assessResult: AssessResult
}
```

### 3.3 제안 Hash 

block에 제안 정보 저장할 때 Hash를 저장하는데 그때 Hash는 다음과 같이 구함

```
proposalInfo {
  proposalId: string;
  name: string;
  description: string;
  type: string;
  fundingAmount: string;
  logo: { name, url, size, doc_hash, }
  attachment: [ { name, url, size, doc_hash, } ]
  vote_start_height: JSBI
  vote_end_height: JSBI
}

const stringify = require('fast-json-stable-stringify');
const boasdk = require('boa-sdk-ts');

boasdk.hash(Buffer.from(stringify(proposalInfo), 'utf8')).toString()

```

관련 함수는 api/boaclient/services/boaclient.js 에서 getProposalDocHash 에 정의되어 있음.

