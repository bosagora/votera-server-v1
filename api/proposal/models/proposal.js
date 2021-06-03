'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const CHANGED_STATUS = [
    'PENDING_VOTE',
    'VOTE',
    'CLOSED'
];

module.exports = {
    lifecycles: {
        async afterCreate(result, data) {
            try {
                if (result.status === 'ASSESS' || result.status === 'PENDING_VOTE') {
                    const subProposal = {
                        id: result.id,
                        name: result.name,
                        type: result.type,
                        status: result.status,
                        proposalId: result.proposalId,
                        creator: result.creator.id,
                    };
                    strapi.services.pubsub.publish('proposalCreated', subProposal)
                        .catch((err) => {
                            strapi.log.warn({err, result}, 'publish.proposalCreated exception');
                        });
                }
            } catch (err) {
                strapi.log.warn({err, result}, 'publish.proposalCreated exception');
            }
        },
        async beforeUpdate(params, data) {
            if (data.status) {
                data.timeAlarm_notified = false;
            }
        },
        async afterUpdate(result, params, data) {
            try {
                if (data.status === 'ASSESS' && result.type === 'BUSINESS') {
                    const subProposal = {
                        id: result.id,
                        name: result.name,
                        type: result.type,
                        status: result.status,
                        proposalId: result.proposalId,
                        creator: result.creator.id,
                    };
                    strapi.services.pubsub.publish('proposalCreated', subProposal)
                        .catch((err) => {
                            strapi.log.warn({err, result, data}, 'publish.proposalCreated exception');
                        });
                    strapi.services.notification.onProposalCreated(result)
                        .catch((err) => {
                            strapi.log.warn({err, result}, 'notification.proposalCreated exception');
                        });
                } else if (CHANGED_STATUS.includes(data.status) && data.status === result.status) {
                    const subProposal = {
                        id: result.id,
                        name: result.name,
                        type: result.type,
                        status: result.status,
                        proposalId: result.proposalId,
                        creator: result.creator.id,
                    };
                    strapi.services.pubsub.publish('proposalChanged', subProposal)
                        .catch((err) => {
                            strapi.log.warn({err, result, data}, 'publish.proposalChanged exception');
                        });
                    strapi.services.notification.onProposalUpdated(result)
                        .catch((err) => {
                            strapi.log.warn({err, result, data}, 'notification.proposalUpdated exception');
                        });
                }
            } catch (err) {
                strapi.log.warn({err, result, data}, 'publish.proposalChanged exception');
            }
        },
    }
};
