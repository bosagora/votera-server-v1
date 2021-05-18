const { gql } = require('apollo-server-koa');

const Input = gql`
    input ListenFeedInput {
        groupId: String
        activityId: String
        postId: String
    }
`

module.exports = Input;