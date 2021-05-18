'use strict';
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async createVoteraActivity(input) {
        let { data } = input;
        let createdActivity;
        try {
            switch (data.type) {
                case 'POLL':
                    createdActivity = await strapi.services.activity.create(data);

                    console.log('createdActivity : ', createdActivity)
                    const createdPoll = await strapi.services.poll.create({
                        activity: createdActivity.id
                    });

                    const items = [];
                    for (let i = 0; i < 3; i++) {
                        items.push({
                            text: 'poll_' + i,
                            sequence: i
                        })
                    }

                    await strapi.services.question.create({
                        type: 'SINGLE_CHOICE',
                        poll: createdPoll.id,
                        content: [{
                            __component: "activity.choice-option-list",
                            item: items
                        }],
                        sequence: 0
                    });


                    return createdActivity;
                case 'SURVEY':
                    createdActivity = await strapi.services.activity.create(data);

                    const createdSurvey = await strapi.services.survey.create({
                        activity: createdActivity.id,
                        //creator: id
                    });

                    let questionPromises = [];
                    for (let i = 0; i < 5; i++) {
                        questionPromises.push(await strapi.services.question.create({
                            title: 'question_' + i,
                            type: 'SCALE',
                            sequence: i,
                            survey: createdSurvey.id,
                            content: [{
                                __component: "activity.scale-option",
                                min: 1,
                                max: 10
                            }]
                        }))
                    }
                    await Promise.all(questionPromises);

                    return createdActivity;
                default:
                    break;
            }
        } catch (e) {
            console.log('CreateActivity error : ', JSON.stringify(e, null, 4));
            return e;
        }
    },
    async summarize(id) {
        if (!id) return;
        const activity = await strapi.services.activity.findOne({ id: id }, [
            { path: 'survey' },
            { path: 'poll' },
            {
                path: 'posts',
                populate: {
                    path: 'writer',
                },
            },
        ]);

        function summarizeResponses(response, questions) {
            const contents = response.map((r) => r.content);
            // console.log('response : ', response)
            // console.log('contents: ', contents);
            // console.log('questions : ', questions);
            /**
             * contents는 array of array이다. 예를 들면,
             * [
             *   [
             *     { 1번문제 답 },
             *     { 2번문제 답 }
             *   ],
             *   [
             *     { 1번문제 답 },
             *     { 2번문제 답 }
             *   ]
             * ]의 형식이다.
             * 각 문제별로 map을 이용해 한꺼번에 집계를 하려고 하는데 위와 같이 되어 있으면 map을 사용할 수 없다.
             * 따라서, 이를
             * [
             *   { 1번문제 답 },
             *   { 2번문제 답 }
             *   { 1번문제 답 },
             *   { 2번문제 답 }
             * ]의 형식으로 만들어 줘야 한다. 이를 평탄화(flatten) 기법이라고 하며 해당하는 javascript 함수는 Array.prototype.flat()이다.
             * 하지만, flat()은 성능이 떨어지기 때문에 아래 코드처럼 reduce()와 concat()을 써서 평탄화할 수도 있다.
             * 성능면에서 더욱 우수한 방법은 전통적인 loop를 이용하는 것이라는 글이 있는데 우선은 reduce()로 구현하고 loop에 대해서는 다시 고려해보기로 한다.
             * TODO: due to performance issue, maybe we might have to convert it to old fashioned loop
             * Please refer to https://dev.to/ryan_dunton/flattening-an-array-a-performance-test-dka
             */

            const flattened = contents.reduce((ray, c) => ray.concat(c), []);
            if (!flattened) return undefined;
            const result = new Map();
            let returnValue = { data: [] };
            // result
            questions.forEach((q) => {
                const matchingAnswers = flattened.filter((c) => {
                    return c.question ? c.question.id === q.id : c.key === q.key;
                });
                if (!matchingAnswers || matchingAnswers.length === 0) return;

                switch (q.type) {
                    case 'SHORT_ANSWER':
                    case 'TEXT': {
                        const distinctAnswers = matchingAnswers
                            .map((c) => c.text)
                            .reduce((a, t) => {
                                a[t] = a[t] || 0;
                                a[t]++;
                                return a;
                            }, {});
                        result.set(q, distinctAnswers);
                        break;
                    }
                    case 'SINGLE_CHOICE':
                    case 'MULTIPLE_CHOICE': {
                        const distinctAnswers = matchingAnswers
                            .map((c) => c.selection)
                            .reduce((a, s) => {
                                s.forEach((it) => {
                                    a[it.sequence] = a[it.sequence] || 0;
                                    a[it.sequence]++;
                                    // return;
                                });
                                return a;
                            }, {});
                        result.set(q, distinctAnswers);
                        break;
                    }
                    case 'SCALE': {
                        const distinctAnswers = matchingAnswers
                            .map((c) => c.value)
                            .reduce((a, t) => {
                                a[t] = a[t] || 0;
                                a[t]++;
                                return a;
                            }, {});
                        result.set(q, distinctAnswers);
                        break;
                    }
                }
            });
            result.forEach((response, key) => {
                returnValue.data.push({
                    question: key,
                    response,
                });
            });
            return returnValue;
        }
        if (activity && activity.posts && activity.posts.length > 0) {
            switch (activity.type) {
                case 'SURVEY': {
                    if (!activity.survey) {
                        const err = new Error(`Activity ${id} has no survey data.`);
                        err.status = 400; // TODO: need to assign a proper error code
                        throw err;
                    }
                    const questions = await strapi.services.question.find({ survey: activity.survey.id });
                    if (!questions || questions.length === 0) {
                        const err = new Error(`Activity ${id} has no survey question.`);
                        err.status = 400; // TODO: need to assign a proper error code
                        throw err;
                    }
                    return summarizeResponses(
                        activity.posts.filter((post) => {
                            return post.type === 'SURVEY_RESPONSE';
                        }),
                        questions,
                    );
                }
                case 'POLL': {
                    if (!activity.poll) {
                        const err = new Error(`Activity ${id} has no poll data.`);
                        err.status = 400; // TODO: need to assign a proper error code
                        throw err;
                    }
                    let questions;
                    try {
                        questions = await strapi.services.question.find({ poll: activity.poll.id });
                    } catch (e) {
                        throw new Error(e);
                    }

                    if (!questions || questions.length === 0) {
                        const err = new Error(`Activity ${id} has no poll question.`);
                        err.status = 400; // TODO: need to assign a proper error code
                        throw err;
                    }
                    // console.log('questions', questions);
                    return summarizeResponses(
                        activity.posts.filter((post) => {
                            return post.type === 'POLL_RESPONSE';
                        }),
                        questions,
                    );
                }
            }
        }
    }
};
