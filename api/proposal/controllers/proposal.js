'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.proposal.search(ctx.query, []);
        } else {
            entities = await strapi.services.proposal.find(ctx.query, []);
        }
        return entities.map((entity) => sanitizeEntity(entity, { model: strapi.models.proposal }));
    },
    async findById(ctx) {
        const { proposalId } = ctx.params;
        const proposal = await strapi.services.proposal.findOne({
            proposalId,
        });
        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    },
    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
        let proposal;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);

            const { creator } = data ? data : {};
            if (!creator) return ctx.badRequest('missing parameter');
            if (!ctx.state.user) return ctx.unauthorized('unauthorized');

            const checkMember = await strapi.services.member.checkMemberUser(creator, ctx.state.user);
            if (!checkMember.member) return ctx.badRequest('member.notFound');
            if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

            proposal = await strapi.services.proposal.createProposal(data, { files });
        } else {
            const { creator } = ctx.request.body;
            if (!creator) return ctx.badRequest('missing parameter');
            if (!ctx.state.user) return ctx.unauthorized('unauthorized');

            const checkMember = await strapi.services.member.checkMemberUser(creator, ctx.state.user);
            if (!checkMember.member) return ctx.badRequest('member.notFound');
            if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

            proposal = await strapi.services.proposal.createProposal(ctx.request.body);
        }
        const payload = await strapi.services.notification.getNotificationPayload({
            ...proposal,
            type: 'NEW_PROPOSAL',
            rejectId: proposal.creator?.id,
            // TODO: rejectId: result.creator.id, 생성자 멤버아이디가 오며, 해당 아이디를 클라이언트에서 확인.
        });
        strapi.services.pubsub.publish('feed', payload.body);

        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    },
    async join(ctx) {
        const { id, actor } = ctx.request.body.input ? ctx.request.body.input : ctx.request.body;
        if (!id || !actor) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');

        const checkMember = await strapi.services.member.checkMemberUser(actor, ctx.state.user);
        if (!checkMember.member) return ctx.badRequest('member.notFound');
        if (!checkMember.authorized) return ctx.unauthorized('member.unauthorized');

        const result = await strapi.services.proposal.joinProposal(id, checkMember.member);
        if (result.proposal) {
            result.proposal = sanitizeEntity(result.proposal, { model: strapi.models.proposal });
        }
        return result;
    },
};
