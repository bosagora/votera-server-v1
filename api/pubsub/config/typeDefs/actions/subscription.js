const { gql } = require('apollo-server-koa');

const Subscription = gql`
    type Query {
        ping: String
    }
    type Subscription {
        listenFeed(input:ListenFeedInput): Notification
    }
`

module.exports = Subscription;