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
        assess_end_offset: env.int('ASSESS_END_OFFSET', 86400),
        vote_begin_offset: env.int('VOTE_BEGIN_OFFSET', 0),
        vote_end_offset: env.int('VOTE_END_OFFSET', 86400)
    }
});
