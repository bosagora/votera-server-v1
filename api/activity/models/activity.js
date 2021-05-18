'use strict';

const { getNotificationPayload } = require('../../notification/services/notification');
const createNickname = require('../../../src/util/nickname/nickname');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            if (!data.name) {
                data.name = 'No name';
            }
            if (!data.effectivedate) {
                // todo: datetime field is not set by trigger.
                data.effectivedate = new Date();
            }
        },
        async afterCreate(result, data) {

            // // TODO : rejectId 수정
            // const payload = await getNotificationPayload({
            //     ...result,
            //     type: 'GROUP_NEW_ACTIVITY',
            //     // rejectId: result.creator.id,
            // });

            // // TODO: inActive 값 쿼리 추가필요
            // strapi.services.pubsub.publish('feed', payload.body);
        }
    },
};
