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
        const { _proposalId } = ctx.params;
        const proposal = await strapi.services.proposal.findOne({
            proposalId: _proposalId,
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
            await strapi.services.member.authorizeMember(creator, ctx.state.user, ctx);

            proposal = await strapi.services.proposal.createProposal(data, { files });
        } else {
            const { creator } = ctx.request.body;
            await strapi.services.member.authorizeMember(creator, ctx.state.user, ctx);

            proposal = await strapi.services.proposal.createProposal(ctx.request.body);
        }

        if (proposal) {
            strapi.services.follow.createMyProposal(ctx.state.user.user_feed, proposal.id)
                .then(() => {
                    if (proposal.status === 'ASSESS' || proposal.status === 'PENDING_VOTE') {
                        strapi.services.notification.onProposalCreated(proposal)
                            .catch((err) => {
                                strapi.log.warn({err, proposal}, 'notification.proposalCreated exception');
                            });
                    }
                })
                .catch((err) => {
                    strapi.log.warn({err, proposal}, 'follow.createProposal error');
                });
        }

        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    },
    async join(ctx) {
        const { id, actor } = ctx.request.body;
        if (!id || !actor) return ctx.throw(400, 'missing parameter');
        const checkMember = await strapi.services.member.authorizeMember(actor, ctx.state.user, ctx);
        if (!checkMember) {
            return;
        }

        const result = await strapi.services.proposal.joinProposal(id, checkMember.member);
        if (result?.proposal) {
            result.proposal = sanitizeEntity(result.proposal, { model: strapi.models.proposal });

            strapi.services.follow.createJoinProposal(ctx.state.user.user_feed, result.proposal.id)
                .catch((err) => {
                    strapi.log.warn({err}, 'follow.createJoinProposal error');
                });
        }

        return result;
    },
};
