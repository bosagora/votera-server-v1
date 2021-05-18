const { ApolloClient } = require('apollo-client');
const { InMemoryCache } = require('apollo-cache-inmemory');
const gql = require('graphql-tag');
const { WebSocketLink } = require('apollo-link-ws');
const { makeExecutableSchema, PubSub } = require('apollo-server-koa');
const { execute, subscribe } = require('graphql');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');
const { SubscriptionClient, SubscriptionServer } = require('subscriptions-transport-ws');
const push = require('../../../src/util/push');
const fcm = require('../../../src/util/fcm');

const ws = require('ws');

const query = gql`
    subscription {
        listenFeed {
            id
            rejectId
            target
            type
            content {
                version
                userName
                activityName
                groupName
                proposalTitle
                questionTitle
                comment
            }
            navigation {
                proposalId
                groupId
                memberId
                activityId
                activityType
                activityCreatorId
                postId
                postCreatorId
                status
            }
            timestamp
        }
    }
`;

/**
 * 발생한 feed payload 를 feedAddress 에 맞춰 저장합니다
 * @param {*} payload
 */
const savePayload = async (targets, payload) => {
    console.log('savePayload', targets);
    const result = await Promise.all(
        targets.map((target) => {
            let feedSet = { ...payload, target: target };
            console.log('feedSet, ', { target: feedSet.target, type: feedSet.type });
            return strapi.services.feeds.create(feedSet);
        }),
    );

    return result;
    // TODO: type 별 target 을 리스트업해 벌크저장 ex> target: feedAddress, ...payload
};

/**
 * member feedAddress 가 어떤 target type, id 에 follow 되어있는지 추출합니다.
 * FIXME: payload에 sourceId 를 정하면 해당 작업이 필요없을 것으로 판단됨.
 * @param {*} payload
 */
const getSource = (payload) => {
    console.log('🚀 ~ payload', payload)
    const { type } = payload;

    let sourceId;

    switch (type) {
        case 'NEW_PROPOSAL':
        case 'VOTING_START':
        case 'VOTING_CLOSED':
            sourceId = payload.navigation.memberId;
            break;
        case 'ASSESS_24HR_DEADLINE':
        case 'ASSESS_CLOSED':
        case 'VOTING_24HR_DEADLINE':
            break;
        case 'NEW_PROPOSAL_NOTICE':
            sourceId = payload.navigation.proposalId;
            break;
        case 'NEW_OPINION_COMMENT':
        case 'NEW_OPINION_LIKE':
            sourceId = payload.navigation.postCreatorId;
            break;
        default:
            break;
    }

    console.log('🚀 ~ sourceId', sourceId)
    return sourceId;
};

/**
 * 각 feedAddress 에 payload 를 publish 합니다
 * @param {*} payload
 */
const publishNotification = async (savedFeedData, targets, pushTokens, payload) => {
    // TODO: savePayload에서 만들어진 feedAddress 목록을 사용하여 payload publish

    // loop publish 동시
    if (pushTokens.length > 0) {
        const messages = await fcm.setMulticastMessages(payload, pushTokens);
        Promise.all(
            messages.map((message) => {
                return fcm.sendToDevices(message);
            }),
        );
    }
    savedFeedData.forEach((data) => {
        strapi.services.feedclient.publish(data.target, { listenNotifications: data });
    });
    // targets.forEach(target => {
    //     strapi.services.feedclient.publish(target, { listenNotifications: payload });
    // })
};

/**
 * feed가 생성될 사용자의 목록을 가져옵니다.
 * @param {*} payload
 */
const getTargets = async (payload) => {
    const sourceId = getSource(payload);
    let follows
    if (sourceId === null || sourceId === undefined || sourceId === '') {
        follows = [];
    } else {
        follows = await strapi.services.follow.find({ target: sourceId, isFeedActive: true });
    }
    // const feedMembers = follows.map(follow => {
    //     return follow.member;
    // });
    let obj = {
        members: [],
        pushTokens: [],
    };
    const addressPair = follows.reduce((acc, cur) => {
        acc.members.push(cur.member);
        if (cur?.isActive && cur?.push?.token) acc.pushTokens.push(cur?.push?.token);
        return acc;
    }, obj);

    const feedMembers = addressPair.members;
    const pushTokens = addressPair?.pushTokens;

    const targets = feedMembers;
    return { targets, pushTokens };
};

const feedManage = async (payload) => {
    const addressPair = await getTargets(payload);
    const targets = addressPair.targets;
    const pushTokens = addressPair?.pushTokens;

    const result = await savePayload(targets, payload);
    publishNotification(result, targets, pushTokens, payload);
};

module.exports = {
    /**
     * FeedManager Server Client
     * Subscribe to Strapi API Server (http://localhost:1337/subscriptions)
     */
    initialize: async () => {
        if (!strapi.config.feedclient.service.enable) {
            return;
        }
        console.log('🚀  Start Feed Manager');

        // TODO: change pubsub to other engine
        if (strapi.config.feedclient?.redis?.enable &&
            strapi.config.feedclient?.redis?.options) {
            const options = {
                ...strapi.config.feedclient.redis.options,
                retryStrategy: (times) => {
                    // reconnect after
                    return Math.min(times * 50, 2000);
                },
            };
            this.feed_pubsub = new RedisPubSub({
                publisher: new Redis(options),
                subscriber: new Redis(options),
            });
        } else {
            this.feed_pubsub = new PubSub();
        }

        const schema = makeExecutableSchema({
            typeDefs: strapi.api.feedclient.config.typeDefs,
            resolvers: strapi.api.feedclient.config.resolver,
        });

        const server = new SubscriptionServer(
            {
                execute,
                subscribe,
                schema,
            },
            {
                server: strapi.server,
                path: strapi.config.feedclient.service.endpoint,
            },
        );
        /** feed client  */
        const link = new WebSocketLink(
            new SubscriptionClient(strapi.config.feedclient.service.pubsub_url, { reconnect: true }, ws),
        );
        const client = new ApolloClient({
            link: link,
            cache: new InMemoryCache(),
        });

        this.feedClient = client.subscribe({
            query: query,
        });

        this.subscribe = this.feedClient.subscribe({
            next: async (data) => {
                const payload = data.data.listenFeed;
                console.log('received payload', payload);
                feedManage(payload);
            },
        });
    },

    publish: (triggerName, payload) => {
        return this.feed_pubsub.publish(triggerName, payload);
    },

    subscribe: (triggerName, onMessage) => {
        return this.feed_pubsub.subscribe(triggerName, onMessage);
    },

    unsubscribe: (subId) => {
        return this.feed_pubsub.unsubscribe(subId);
    },

    asyncIterator: (triggers) => {
        return this.feed_pubsub.asyncIterator(triggers);
    },
};
