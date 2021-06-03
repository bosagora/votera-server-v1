'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async toggleLike(ctx) {
        const { isLike, postId, memberId } = ctx.request.body;
        if (!postId || !memberId) return ctx.throw(400, 'missing parameter');
        await strapi.services.member.authorizeMember(memberId, ctx.state.user, ctx);

        const result = await strapi.services.interaction.toggleLike(isLike, postId, memberId, ctx.state.user);
        if (result.interaction) {
            result.interaction = sanitizeEntity(result.interaction, { model: strapi.models.interaction });
        }
        return result;
    },
    async reportedPosts(ctx) {
        const { _proposalId } = ctx.params;
        if (!_proposalId) return ctx.throw(400, 'missing parameter');
        if (!ctx.state.user) return [];
        const userId = ctx.state.user.id;

        const results = await strapi.services.interaction.listReportedPosts(_proposalId, userId);
        return results;
    },
    async reportPost(ctx) {
        const { postId, activityId, proposalId, actor } = ctx.request.body;
        if (!postId || !activityId || !proposalId || !actor) return ctx.throw(400, 'missing parameter');
        await strapi.services.member.authorizeMember(actor, ctx.state.user, ctx);

        const result = await strapi.services.interaction.createReportPost(postId, activityId, proposalId, actor, ctx.state.user);
        return sanitizeEntity(result, { model: strapi.models.interaction });
    }
};
