'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async find(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services['member-role'].search(ctx.query, []);
        } else {
            entities = await strapi.services['member-role'].find(ctx.query, []);
        }

        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models['member-role'] }));
    },
    leaveProposal: async (ctx) => {
        const {proposalId, memberId} = ctx.request.body.input;
        if (!proposalId || !memberId) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');

        const checkMember = await strapi.services.member.checkMemberUser(memberId, ctx.state.user);
        if (!checkMember.member) return ctx.badRequest('member.notFound');
        if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

        return await strapi.services['member-role'].leaveProposal(proposalId, memberId);
    },
};
