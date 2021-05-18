'use strict';

module.exports = {
    definition: `
        type SummarizeResponseData {
            question: Question
            response: JSON
        }
        type SummarizeResponse {
            data: [SummarizeResponseData!]!
        }
    `,
    query: `
        summarize(id: ID): SummarizeResponse
    `,
    mutation: `
    `,
    resolver: {
        Query: {
            summarize: {
                description: 'Summarize the result of an activity counting all response posts',
                resolver: 'application::activity.activity.summarize',
            },
        },
        Mutation: {
        },
    },
};
