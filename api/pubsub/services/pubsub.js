const { makeExecutableSchema, PubSub } = require('apollo-server-koa');
const { execute, subscribe } = require('graphql');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');
const { SubscriptionServer } = require('subscriptions-transport-ws');

module.exports = {

    initialize: async () => {

        if (!strapi.config.pubsub.service.enable) {
            return;
        }
        console.log("🚀  Start Strapi API Server")

        // TODO: change pubsub to other engine like this
        if (strapi.config.pubsub?.redis?.enable &&
            strapi.config.pubsub?.redis?.options) {
            const options = {
                ...strapi.config.pubsub.redis.options,
                retryStrategy: times => {
                    // reconnect after
                    return Math.min(times * 50, 2000);
                }
            };
            this.pubsub = new RedisPubSub({
                publisher: new Redis(options),
                subscriber: new Redis(options),
            });
        } else {
            this.pubsub = new PubSub();
        }

        const pubsubConfig = strapi.api.pubsub.config;
        const typeDefs = `
            ${pubsubConfig.definition}
            type Query {
                ${pubsubConfig.query}
            }
            type Subscription {
                ${pubsubConfig.subscription}
            }
        `;

        const schema = makeExecutableSchema({
            typeDefs,
            resolvers: pubsubConfig.resolver
        });

        const server = new SubscriptionServer({
            execute,
            subscribe,
            schema,
            onConnect: (connectionParams, webSocket, context) => {
                if (connectionParams.authToken) {
                    return strapi.plugins['users-permissions'].services.jwt.verify(connectionParams.authToken)
                        .then((data) => {
                            return strapi.plugins[
                                'users-permissions'
                              ].services.user.fetchAuthenticatedUser(data.id);
                        })
                        .then(user => {
                            return { currentUser: user };
                        })
                        .catch((err) => {
                            throw err;
                        });
                }

                throw new Error('missing auth token');
            },
        }, {
            server: strapi.server,
            path: strapi.config.pubsub.service.endpoint
        });
    },

    publish: (triggerName, payload) => {
        // strapi.log.debug({trigger: triggerName, payload: payload}, 'PubSub.publish, to', triggerName);
        // console.log(`publish trigger=${triggerName}  payload=${JSON.stringify(payload)}`);
        return this.pubsub ? this.pubsub.publish(triggerName, payload) : undefined;
    },

    subscribe: (triggerName, onMessage) => {
        return this.pubsub ? this.pubsub.subscribe(triggerName, onMessage) : undefined;
    },

    unsubscribe: (subId) => {
        return this.pubsub ? this.pubsub.unsubscribe(subId) : undefined;
    },

    asyncIterator: (triggers) => {
        // strapi.log.debug({trigger: triggers}, 'PubSub.asyncIterator listen by', triggers);
        return this.pubsub ? this.pubsub.asyncIterator(triggers) : undefined;
    }
};
