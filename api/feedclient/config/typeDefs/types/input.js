const { gql } = require('apollo-server-koa');

const Input = gql`
    input NotificationsInput {
        memberId: String
    }
`

module.exports = Input;