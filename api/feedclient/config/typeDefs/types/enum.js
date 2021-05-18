const { gql } = require('apollo-server-koa');


const Enum = gql`
    enum ENUM_NOTIFICATION_TYPE {
        NEW_PROPOSAL
        ASSESS_24HR_DEADLINE
        ASSESS_CLOSED
        VOTING_START
        VOTING_24HR_DEADLINE
        VOTING_CLOSED
        NEW_PROPOSAL_NOTICE
        NEW_OPINION_COMMENT
        NEW_OPINION_LIKE
    }
`
module.exports = Enum;