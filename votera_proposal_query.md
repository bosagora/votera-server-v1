**1. https://vtrstrapi.abowa.io/graphql 접속**

Graphql Doc 확인 가능


**2. Login**

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

*** 아래 부터는 헤더에 Authorization 필요**

```javascript
{
 "Authorization": "Bearer ${3번에서 얻은 jwt 값}"
}
```


**3. Query**

**3.0 Propsal Type** 
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
attachment(...): [UploadFile]
activities(...): [Activity]
roles(...): [MemberRole]
interactions(...): [Interaction]
}
```
주의 할 점은 여기의 ID는 mongo db의 id입니다.
일반적인 조회에서는 mongo db의 id를 사용하고, 12자리로 정의된 proposal_id 로 조회하는 것은 아래에 따로 Query가 정의되어 있다.

**3.1 전체 proposal query**

```
query {
	proposals {
    id
    name
    description
    type
    evalPeriod{
      begin
      end
    }
    votePeriod {
      begin
      end
    }
    fundingAmount
    logo{
      url
      mime
      size
    }
    attachment {
      url
      mime
      size
    }
  }
}
```

**3.2 특정 proposal query**

```javascript
query {
	proposalById(proposalId: "611888381567") {
    id
    name
    description
    type
    evalPeriod{
      begin
      end
    }
    votePeriod {
      begin
      end
    }
    fundingAmount
    logo{
      url
    	hash
      mime
      size
    }
    attachment {
      url
    	hash
      mime
      size
    }
  }
}
```

https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#api-parameters

_start : Skip a specific number of entries (especially useful for pagination)
_limit : Limit the size of the returned results. (default limit 100)

example
GET /proposals?_start=10&_limit=10

_sort : Sort according to a specific field.

example:
ASC: GET /proposals?_sort=name:ASC
DESC: GET /proposals?_sort=name:DESC
sorting on multiple fields
GET /proposals?_sort=name:ASC,createdAt:DESC

Filters


proposalId=123123
proposalId_eq=123123
proposalId_ne=123123
proposalId_in=['123123','234234']
proposalId_nin=['123123','234234']
proposalId_lt=123123
proposalId_lte=123123
proposalId_gt=123123
proposalId_gte=123123


http://localhost:5000/qrcode/login/:index
http://localhost:5000/qrcode/vote/:index/:height

http://localhost:5000/proposal/fee/:proposalId/:index
http://localhost:5000/proposal/data/:proposalId/:index
