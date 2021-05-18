'use strict';

module.exports = {
    definition: `
        input deleteNoticeInput {
            ids: [ID!]
        }
    `,
    query: `
        listPosts(sort: String, limit: Int, start: Int, where: JSON): [Post]
    `,
    mutation: `
        deleteNotices(input: deleteNoticeInput!): Boolean
        processReportOnPost(id: ID!): Post
    `,
    resolver: {
        Query: {
            listPosts: {
                description: 'List up Post (comment)',
                resolver: 'application::post.post.listPosts',
            },
        },
        Mutation: {
            deleteNotices: {
                description: 'Delete Notices',
                resolverOf: 'application::post.post.delete',
                resolver: async (obj, options, { context }) => {
                    const { input } = options;
                    const result = await strapi.services.post.deleteNotices(input);
                    return result;
                }
            },
            processReportOnPost: {
                description: 'Process Report Test',
                resolverOf: 'application::post.post.find',
                resolver: async (obj, options, { context }) => {
                    const { id } = options;
                    const result = await strapi.services.post.processReportOnPost(id);
                    return result;
                }
            }
        }
    }
}