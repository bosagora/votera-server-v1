'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const usePublishTypes = [
    'BOARD_ARTICLE', // 공지
    'COMMENT_ON_ACTIVITY',
    'COMMENT_ON_POST', // 공지,의견에 답변
    'REPLY_ON_COMMENT', // 답변의 답변 (사용하지 않음)
];

const useNotifyTypes = [
    'BOARD_ARTICLE', // 공지
    'COMMENT_ON_POST', // 공지,의견에 답변
    'REPLY_ON_COMMENT', // 답변의 답변 (사용하지 않음)
]

module.exports = {
    lifecycles: {
        async afterCreate(result) {
            try {
                if (usePublishTypes.includes(result.type)) {
                    const subPost = {
                        id: result.id,
                        type: result.type,
                        activity: result.activity?.id,
                        parentPost: result.parentPost?.id,
                        writer: result.writer?.id,
                    };
                    strapi.services.pubsub.publish('postCreated', subPost)
                        .catch((err) => {
                            strapi.log.warn({error, result}, 'publish.postCreated exception');
                        });
                }

                if (useNotifyTypes.includes(result.type)) {
                    strapi.services.notification.onPostCreated(result)
                        .catch((err) => {
                            strapi.log.warn({error, result}, 'notification.postCreated exception');
                        });
                }
            } catch (error) {
                strapi.log.warn({error, result}, 'publish.postCreated exception');
            }
        },
    },
};
