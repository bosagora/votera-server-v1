'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    definition: `
        input readInteractionInput {
            activity: ID!
            actor: ID!
        }
        type readInteractionPayload {
            count: Int
        }
        input toggleLikeInput {
            isLike : Boolean!
            postId:String
            memberId:String
        }
        type toggleLikePayload {
            isLike:Boolean
            interaction:Interaction
        }
        input reportPostInput {
            postId: ID!
            activityId: ID!
            proposalId: ID!
            actor: ID! 
        }
    `,
    query: `
        reportedPosts(proposalId: String!): [ID]
    `,
    mutation: `
        readInteraction(input: readInteractionInput): readInteractionPayload
        toggleLike(input:toggleLikeInput): toggleLikePayload
        reportPost(input: reportPostInput): createInteractionPayload
    `,
    resolver: {
        Query: {
            reportedPosts: {
                description: 'Get Reported Posts by current user',
                resolverOf: 'application::interaction.interaction.reportedPosts',
                resolver: async (obj, options, { context }) => {
                    const { proposalId } = options;
                    if (!proposalId) throw new Error('missing parameter');
                    if (!context.state.user) {
                        return []
                    };
                    const userId = context.state.user.id;

                    const results = await strapi.services.interaction.listReportedPosts(proposalId, userId);
                    return results;
                }
            },
        },
        Mutation: {
            readInteraction: {
                description: 'Read Interaction',
                resolverOf: 'application::interaction.interaction.update',
                resolver: 'application::interaction.interaction.readInteraction',
            },
            toggleLike: {
                description: '좋아요 버튼을 상황에 따라서 토글시킨다.',
                resolverOf: 'application::interaction.interaction.update',
                resolver: 'application::interaction.interaction.toggleLike',
            },
            reportPost: {
                description: 'Post 신고',
                resolver: 'application::interaction.interaction.reportPost',
            },
        },
    },
};
