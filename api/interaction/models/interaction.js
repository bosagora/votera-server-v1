'use strict';

module.exports = {
    lifecycles: {
        async afterCreate(result) {
            console.log('🚀 ~ result', result)
            const interactionType = result.type;
            const ableFeedTypes = ['LIKE_POST'];
            if (ableFeedTypes.includes(interactionType) && result.post?.type !== 'REPLY_ON_COMMENT') {
                const payload = await strapi.services.notification.getNotificationPayload({...result, rejectId: result.actor?.id});
                await strapi.services.pubsub.publish('feed', payload.body);
            }
        }
    }
};
