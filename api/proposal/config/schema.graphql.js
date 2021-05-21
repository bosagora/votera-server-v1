'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    definition: `
        type VoteraProposal {
            id: String!
            proposalId: String!
            name: String!
            description: String
            type: ENUM_PROPOSAL_TYPE
            evalPeriod: ComponentCommonPeriod
            votePeriod: ComponentCommonPeriod
            fundingAmount: String
            logo: UploadFile
            attachment: [UploadFile]
        }
        input PeriodInput {
            evalBegin: DateTime
            evalEnd: DateTime
            voteBegin: DateTime
            voteEnd: DateTime
            fundingAmount: String
        }
        input createVoteraProposalInput  {
            proposal: ProposalInput
            period: PeriodInput
        }
        enum ENUM_FEE_STATUS {
            WAIT
            PAID
            EXPIRED
            INVALID
            IRRELEVANT
        }
        type ProposalFeePayload {
            status: ENUM_FEE_STATUS
            proposer_address: String
            destination: String
            amount: String
        }
        type VoteFeePayload {
            status: ENUM_FEE_STATUS
            proposal: Proposal
        }
        input joinProposalInput {
            id: ID!
            actor: ID!
        }
        type JoinProposalPayload {
            invalidVoterCard: Boolean
            proposal: Proposal
        }
    `,
    query: `
        proposalById(proposalId: String!): Proposal
        proposalFee(id: ID!): ProposalFeePayload
        voteFee(id: ID!): VoteFeePayload
    `,
    mutation: `
        joinProposal(input: joinProposalInput!): JoinProposalPayload
    `,
    resolver: {
        Query: {
            proposalFee: {
                description: 'Get Proposal Fee',
                resolverOf: 'application::proposal.proposal.update',
                resolver: async (obj, options, ctx) => {
                    const { id } = options;
                    const result = await strapi.services.proposal.proposalFee(id);
                    return result;
                }
            },
            voteFee: {
                description: 'Get Vote Fee',
                resolverOf: 'application::proposal.proposal.update',
                resolver: async (obj, options, ctx) => {
                    const { id } = options;
                    const result = await strapi.services.proposal.voteFee(id);
                    return result;
                },
            },
            proposalById: {
                description: 'Get a Proposal by proposalId',
                resolverOf: 'application::proposal.proposal.findById',
                resolver: async (obj, options, ctx) => {
                    const { proposalId } = options;
                    const proposal = await strapi.services.proposal.findOne({
                        proposalId
                    });
                    return proposal;
                }
            },
        },
        Mutation: {
            createProposal: {
                description: 'Create a new Proposal',
                resolverOf: 'application::proposal.proposal.create',
                resolver: async (obj, options, { context }) => {
                    const { input } = options;

                    const { creator } = input.data ? input.data : {};
                    if (!creator) throw new Error('missing parameter');
                    if (!context.state.user) return new Error('unauthorized');

                    const checkMember = await strapi.services.member.checkMemberUser(creator, context.state.user);
                    if (!checkMember.member) throw new Error('member.notFound');
                    if (!checkMember.authorized) throw new Error('member.unauthorized');

                    const proposal = await strapi.services.proposal.createProposal(input.data);
                    const payload = await strapi.services.notification.getNotificationPayload({
                        ...proposal,
                        type: 'NEW_PROPOSAL',
                        rejectId: proposal.creator?.id,
                        // TODO: rejectId: result.creator.id, 생성자 멤버아이디가 오며, 해당 아이디를 클라이언트에서 확인.
                    });
                    strapi.services.pubsub.publish('feed', payload.body);

                    return { proposal: sanitizeEntity(proposal, { model: strapi.models.proposal }) };
                }
            },
            joinProposal: {
                description: 'Join Proposal',
                resolverOf: 'application::proposal.proposal.join',
                resolver: 'application::proposal.proposal.join'
            }
        },
    },
};
