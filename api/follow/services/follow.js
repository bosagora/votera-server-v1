'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async createMyProposal(userFeedId, proposalId) {
        const found = await strapi.query('follow').findOne({
            target: proposalId,
            user_feed: userFeedId,
            type: 'PROPOSAL_CREATE',
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: proposalId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: 'PROPOSAL_CREATE',
        });
        return result;
    },
    async createJoinProposal(userFeedId, proposalId) {
        const found = await strapi.query('follow').findOne({
            target: proposalId,
            user_feed: userFeedId,
            type: 'PROPOSAL_JOIN',
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: proposalId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: 'PROPOSAL_JOIN',
        });
        return result;
    },
    async createMyComment(userFeedId, postId) {
        const found = await strapi.query('follow').findOne({
            target: postId,
            user_feed: userFeedId,
            type: 'POST',
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: postId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: 'POST',
        });
        return result;
    }
};
