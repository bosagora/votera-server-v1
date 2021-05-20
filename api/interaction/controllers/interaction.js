'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    /**
     * FIXME: 구조적 문제, 조회수를 추출하기 위해서 각 인터렉션의 count 를 모두 합산하는
     * 과정이 비효율적이고, 매번 호출때마다, 인터렉션을 찾은다음 카운트를 더하는 것이
     * 문제가 있음.
     * @param {*} ctx
     */
    async readInteraction(ctx) {
        const { activity, actor } = ctx.request.body.input;
        const foundInteraction = await strapi.services.interaction.findOne({ activity, actor, type: 'READ_ACTIVITY' });

        if (foundInteraction) {
            foundInteraction.action[0].count++;
            const updated = await strapi.services.interaction.update(
                { id: foundInteraction._id },
                { action: foundInteraction.action },
            );
        } else {
            const created = await strapi.services.interaction.create({
                type: 'READ_ACTIVITY',
                activity,
                actor,
                action: [
                    {
                        __component: 'interaction.read',
                        count: 1,
                    },
                ],
            });
        }

        return { count: 1 };
    },
    async toggleLike(ctx) {
        const graphqlApi = !!ctx.request.body.input;
        const { isLike, postId, memberId } = graphqlApi ? ctx.request.body.input : ctx.request.body;
        if (!postId || !memberId) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');

        const checkMember = await strapi.services.member.checkMemberUser(memberId, ctx.state.user);
        if (!checkMember.member) return ctx.badRequest('member.notFound');
        if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

        const result = await strapi.services.interaction.toggleLike(isLike, postId, memberId, ctx.state.user);
        if (result.interaction) {
            result.interaction = sanitizeEntity(result.interaction, { model: strapi.models.interaction });
        }
        return result;
    },
    async reportedPosts(ctx) {
        const { proposalId } = ctx.request.params;
        if (!proposalId) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return [];
        const userId = ctx.state.user.id;

        const results = await strapi.services.interaction.listReportedPosts(proposalId, userId);
        return results;
    },
    async reportPost(ctx) {
        const graphqlApi = !!ctx.request.body.input;
        const { postId, activityId, proposalId, actor } = graphqlApi ? ctx.request.body.input : ctx.request.body;
        if (!postId || !activityId || !proposalId || !actor) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');

        const checkMember = await strapi.services.member.checkMemberUser(actor, ctx.state.user);
        if (!checkMember.member) return ctx.badRequest('member.notFound');
        if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

        const result = await strapi.services.interaction.createReportPost(postId, activityId, proposalId, actor, ctx.state.user);
        return graphqlApi ? { interaction: sanitizeEntity(result, { model: strapi.models.interaction }) } : sanitizeEntity(result, { model: strapi.models.interaction });
    }
};
