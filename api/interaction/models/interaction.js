'use strict';

module.exports = {
    lifecycles: {
        async afterCreate(result, data) {
            try {
                if (result.type === 'LIKE_POST') {
                    strapi.services.notification.onInteractionCreated(result)
                        .catch((err) => {
                            strapi.log.warn({err, result}, 'notification.interactionCreated exception');
                        });
                }
            } catch (err) {
                strapi.log.warn({err, result}, 'interaction.afterCreate exception');
            }
        },
    },
};
