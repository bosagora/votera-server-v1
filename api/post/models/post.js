'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const TYPE_QUIZ = 'QUIZ_RESPONSE';

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            // const payload = {
            //     id: data.id,
            //     type: data.type,
            //     activity: data.activity.id,
            //     content: data.content,
            //     // group is not defined in post model but added while in pubsub
            //     group: data.activity && data.activity.group && data.activity.group.toString(),
            //     writer: data.writer// && data.writer.address
            // };
            // if (payload.type === 'QUIZ_RESPONSE') {
            //     const score = await strapi.services.post.gradingQuiz(payload);
            //     await strapi.services['score-board'].create({
            //         type: 'REALTIME',
            //         record: [{
            //             score,
            //             member: data.writer,
            //             answer: data.id
            //         }],
            //         activity: data.activity.id
            //     })
            // }
        },
        async beforeUpdate(where, data) {
            try {
                const payload = {
                    id: data.id,
                    type: data.type,
                    activity: data.activity ? data.activity.id : undefined,
                    content: data.content,
                    // group is not defined in post model but added while in pubsub
                    group: data.activity && data.activity.group && data.activity.group.toString(),
                    writer: data.writer,
                };

                if (payload.type === 'QUIZ_RESPONSE') {
                    const score = await strapi.services.post.gradingQuiz(payload);
                    await strapi.query('post.record').model.updateOne(
                        {
                            member: data.writer,
                            answer: where._id,
                        },
                        { score: score },
                    );
                }
            } catch (e) {
                console.log(e);
            }
        },
        async afterCreate(result) {
            // console.log('🚀 ~ result', result)
            try {
                const useFeedTypes = [
                    'COMMENT_ON_POST', // ACTIVITY_COMMENT
                    'BOARD_ARTICLE',
                ];
                if (useFeedTypes.includes(result.type)) {
                    const payload = await strapi.services.notification.getNotificationPayload({
                        ...result,
                        rejectId: result.writer?.id,
                    });
                    await strapi.services.pubsub.publish('feed', payload.body);
                }

                const payload = {
                    id: result.id,
                    type: result.type,
                    activity: result.activity?.id,
                    content: result.content,
                    // group is not defined in post model but added while in pubsub
                    group: result.activity && result.activity.group && result.activity.group.toString(),
                    writer: result.writer, // && data.writer.address
                };

                if (payload.type === 'QUIZ_RESPONSE') {
                    const score = await strapi.services.post.gradingQuiz(payload);
                    await strapi.services['score-board'].create({
                        type: 'REALTIME',
                        record: [
                            {
                                score,
                                member: result.writer,
                                answer: result.id,
                            },
                        ],
                        activity: result.activity.id,
                    });
                }
            } catch (error) {
                console.log('🚀 ~ file: post.js ~ line 102 ~ afterCreate ~ error', error);
            }
        },
    },
};
