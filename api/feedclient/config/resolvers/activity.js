const { withFilter } = require('apollo-server-koa');
const resolvers = {
    Query: {
        ping: () => ('pong')
    },
    Subscription: {
        listenNotifications: {
            subscribe: withFilter((args, root, context) => {
                const {
                    memberId
                } = root.input;
                console.log('memberId', memberId);
                return strapi.services.feedclient.asyncIterator(memberId);
            }, 
            (payload, variables) => {
                if (payload.listenNotifications.target !== variables.input.memberId){
                    return false;
                }
                return true;
            })
        }
    }
}

module.exports = { resolvers }