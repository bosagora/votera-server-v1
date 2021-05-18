'use strict';

module.exports = {
    definition: `
        input leaveProposalInput {
            proposalId: ID!
            memberId: ID!
        }
    `,
    query: ``,
    mutation: `
        leaveProposal(input: leaveProposalInput): MemberRole
    `,
    resolver: {
        Query: {},
        Mutation: {
            leaveProposal: {
                description: 'Leave Votera Proposal',
                resolver: 'application::member-role.member-role.leaveProposal',
            },
        },
    },
};
