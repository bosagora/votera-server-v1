module.exports = ({env}) => ({
    stoa: {
        url: env('STOA_URL'),
        port: env.int('STOA_PORT', 3836),
    },
    agora: {
        url: env('AGORA_URL'),
        port: env.int('AGORA_PORT', 2826),
    },
    service: {
        vote_payload_size: env.int('VOTE_PAYLOAD_SIZE', 273),
    }
});
