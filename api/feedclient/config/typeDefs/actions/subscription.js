const { gql } = require('apollo-server-koa');

const Subscription = gql`
    type Query {
        ping: String
    }
    type Subscription {
        listenNotifications(input: NotificationsInput): Notification
    }
`

module.exports = Subscription;