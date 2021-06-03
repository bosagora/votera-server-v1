'use strict';

module.exports = {
    definition: `
        input toggleLikeInputData {
            isLike : Boolean!
            postId:String
            memberId:String
        }
        input toggleLikeInput {
            data: toggleLikeInputData
        }
        type toggleLikePayload {
            isLike:Boolean
            interaction:Interaction
        }
        input reportPostInputData {
            postId: ID!
            activityId: ID!
            proposalId: ID!
            actor: ID! 
        }
        input reportPostInput {
            data: reportPostInputData
        }
    `,
    query: `
        reportedPosts(proposalId: String!): [ID]
    `,
    mutation: `
        toggleLike(input:toggleLikeInput): toggleLikePayload
        reportPost(input: reportPostInput): createInteractionPayload
    `,
    resolver: {
        Query: {
            reportedPosts: {
                description: 'Get Reported Posts by current user',
                resolver: 'application::interaction.interaction.reportedPosts',
            },
        },
        Mutation: {
            toggleLike: {
                description: '좋아요 버튼을 상황에 따라서 토글시킨다.',
                resolver: 'application::interaction.interaction.toggleLike',
            },
            reportPost: {
                description: 'Post 신고',
                resolverOf: 'application::interaction.interaction.reportPost',
                resolver: async (obj, options, { context }) => {
                    const interaction = await strapi.controllers.interaction.reportPost(context);
                    return { interaction };
                }
            },
        },
    },
};
