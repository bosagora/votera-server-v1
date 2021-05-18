module.exports = ({env}) => ({
    service: {
        enable: env.bool('FEED_ENABLE', false),
        endpoint: env('FEED_ENDPOINT', '/feedsub'),
        pubsub_url: env('FEED_PUBSUB_SERVER')
    },
    redis: {
        enable: env.bool('FEED_REDIS_ENABLE', false),
        options: {
            host: env('FEED_REDIS_HOST'),
            port: env.int('FEED_REDIS_PORT', 6379),
            username: env('FEED_REDIS_USERNAME'),
            password: env('FEED_REDIS_PASSWORD')
        }
    },
});
