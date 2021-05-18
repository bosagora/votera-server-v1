module.exports = ({env}) => ({
    service: {
        enable: env.bool('PUBSUB_ENABLE', false),
        endpoint: env('PUBSUB_ENDPOINT', '/subscriptions'),
    },
    redis: {
        enable: env.bool('PUBSUB_REDIS_ENABLE', false),
        options: {
            host: env('PUBSUB_REDIS_HOST'),
            port: env.int('PUBSUB_REDIS_PORT', 6379),
            username: env('PUBSUB_REDIS_USERNAME'),
            password: env('PUBSUB_REDIS_PASSWORD'),
        },
    },
});
