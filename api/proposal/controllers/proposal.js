'use strict';
const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

function checkCreateProposalStatus(proposal, ctx) {
    switch(proposal.type) {
        case 'SYSTEM':
            if (proposal.status !== 'PENDING_VOTE') {
                return ctx.throw(400, 'invalid proposal status');
            }
            break;
        case 'BUSINESS':
            if (proposal.status !== 'PENDING_ASSESS') {
                return ctx.throw(400, 'invalid proposal status');
            }
            break;
        default:
            return ctx.throw(400, 'unknown proposal type');
    }
}

async function addTestSurvey(proposal, ctx) {
    if (!proposal || proposal.type !== 'BUSINESS') {
        return;
    }
    if (proposal.status !== 'PENDING_VOTE' && proposal.status !== 'VOTE' && proposal.status !== 'CLOSED') {
        return;
    }

    try {
        const assessActivity = proposal.activities?.find(
            (activity) => activity?.type === 'SURVEY',
        );
        if (!assessActivity) {
            return;
        }
    
        const activity = await strapi.services.activity.findOne({id: assessActivity.id}, [
            { path: 'survey', populate: { path: 'questions'} }
        ])
    
        const assessResult = [
            {key: 0, value: 7},
            {key: 1, value: 7},
            {key: 2, value: 8},
            {key: 3, value: 8},
            {key: 4, value: 6},
        ];
        const data = {
            activity: activity.id,
            type: 'SURVEY_RESPONSE',
            status: 'OPEN',
            content: activity.survey?.questions?.map((q) => {
                if (q?.sequence !== undefined) {
                    return {
                        __component: 'post.scale-answer',
                        value: assessResult[q?.sequence].value,
                        sequence: assessResult[q?.sequence].key,
                        question: q.id,
                    };
                }
            })
        };
    
        const post = await strapi.services.post.create(data);
        if (post) {
            console.log('create survey post id : ', post.id);
        }
    } catch (err) {
        console.log('addTestSurvey error ', err);
    }
}

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
    async findVotera(ctx) {
        const { _proposalId } = ctx.params;
        const proposal = await strapi.services.proposal.findOne({
            proposalId: _proposalId,
        });
        let tempProposal = sanitizeEntity(proposal, { model: strapi.models.proposal });
        if (tempProposal && tempProposal.type === 'BUSINESS') {
            tempProposal = await strapi.services.proposal.assessResult(tempProposal);
        }
        const {
            creator,
            member_count,
            timeAlarm_notified,
            activities,
            roles,
            interactions,
            ...voteraProposal } = tempProposal;
        return voteraProposal;
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
            checkCreateProposalStatus(data, ctx);

            proposal = await strapi.services.proposal.createProposal(data, { files });
        } else {
            const { creator } = ctx.request.body;
            await strapi.services.member.authorizeMember(creator, ctx.state.user, ctx);
            checkCreateProposalStatus(ctx.request.body, ctx);

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
    async testCreate(ctx) {
        let proposal;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            proposal = await strapi.services.proposal.createProposal(data, { files });
        } else {
            proposal = await strapi.services.proposal.createProposal(ctx.request.body);
        }
        await addTestSurvey(proposal, ctx);
        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    }
};
