'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    leaveProposal: async (proposalId, memberId) => {
        try {
            // Administrator는 Leave 할 수 없음
            const memberRole = await strapi.services['member-role'].update(
                {
                    type_ne: 'ADMINISTRATOR',
                    scope: 'PROPOSAL',
                    proposal: proposalId,
                    member: memberId,
                    status_ne: 'LEAVE',
                },
                {
                    status: 'LEAVE',
                },
            );

            console.log('memberRole : ', memberRole);
        } catch (error) {
            console.log('leaveGroup Error : ', error);
            return ctx.badRequest(error);
        }
    },
};
