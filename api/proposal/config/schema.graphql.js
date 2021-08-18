'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    definition: `
        type AssessResult {
            average: Float
            nodeCount: Int
            completeness: Float
            realization: Float
            profitability: Float
            attractiveness: Float
            expansion: Float
        }
        type VoteraProposal {
            id: ID!
            createdAt: DateTime!
            updatedAt: DateTime!
            name: String!
            description: String
            type: ENUM_PROPOSAL_TYPE
            status: ENUM_PROPOSAL_STATUS
            fundingAmount: String
            proposalId: String!
            logo: UploadFile
            assessPeriod: ComponentCommonPeriod
            votePeriod: ComponentCommonPeriod
            proposal_address: String
            proposal_fee_address: String
            proposal_fee: String
            tx_hash_proposal_fee: String
            vote_start_height: Int
            vote_end_height: Int
            doc_hash: String
            vote_fee: String
            tx_hash_vote_fee: String
            validators: String
            proposal_begin: Int
            attachment: [UploadFile]
            assessResult: AssessResult
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
        voteraProposal(proposalId: String!): VoteraProposal
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
                description: 'Get a API Proposal by proposalId',
                resolver: 'application::proposal.proposal.findById',
            },
            voteraProposal: {
                description: 'Get a VoteraProposal by proposalId',
                resolver: 'application::proposal.proposal.findVotera',
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
