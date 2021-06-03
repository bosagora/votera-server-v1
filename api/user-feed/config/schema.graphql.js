'use strict';

module.exports = {
    query: `
        meFeedEx: UserFeed
    `,
    resolver: {
        Query: {
            meFeedEx: {
                resolver: 'application::user-feed.user-feed.meFeedEx'
            },
        }
    }
}
