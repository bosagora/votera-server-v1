const { withFilter } = require('apollo-server-koa');

const resolvers = {
    Query: {
        ping: () => ('pong')
    },
    Subscription: {
        listenFeed: {
            subscribe: withFilter(() => {
                return strapi.services.pubsub.asyncIterator('feed');
            },
            (payload, variables) => {
                if (variables.groupId && variables.groupId !== payload.listenFeed?.navigation?.groupId) {
                    return false;
                }
                if (variables.activityId && variables.activityId !== payload.listenFeed?.navigation?.activityId) {
                    return false;
                }
                if (variables.postId && variables.postId !== payload.listenFeed?.navigation?.postId) {
                    return false;
                }
                return true;
            })
        },
    }
}

module.exports = { resolvers }