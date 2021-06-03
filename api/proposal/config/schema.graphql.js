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
        input joinProposalInputData {
            id: ID!
            actor: ID!
        }
        input joinProposalInput {
            data: joinProposalInputData
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
                resolverOf: 'application::proposal.proposal.findOne',
                resolver: async (obj, options, ctx) => {
                    const { id } = options;
                    const result = await strapi.services.proposal.proposalFee(id);
                    return result;
                }
            },
            voteFee: {
                description: 'Get Vote Fee',
                resolverOf: 'application::proposal.proposal.findOne',
                resolver: async (obj, options, ctx) => {
                    const { id } = options;
                    const result = await strapi.services.proposal.voteFee(id);
                    return result;
                },
            },
            proposalById: {
                description: 'Get a Proposal by proposalId',
                resolver: 'application::proposal.proposal.findById',
            },
        },
        Mutation: {
            createProposal: {
                description: 'Create a new Proposal',
                resolverOf: 'application::proposal.proposal.create',
                resolver: async (obj, options, { context }) => {
                    const proposal = await strapi.controllers.proposal.create(context);
                    return { proposal };
                }
            },
            joinProposal: {
                description: 'Join Proposal',
                resolver: 'application::proposal.proposal.join'
            }
        },
    },
};
