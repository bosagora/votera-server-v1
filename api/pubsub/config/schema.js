const { withFilter } = require('apollo-server-koa');

module.exports = {
    definition: `
        enum ENUM_NOTIFICATION_TYPE {
            NEW_PROPOSAL
            ASSESS_24HR_DEADLINE
            ASSESS_CLOSED
            VOTING_START
            VOTING_24HR_DEADLINE
            VOTING_CLOSED
            NEW_PROPOSAL_NOTICE
            NEW_OPINION_COMMENT
            NEW_OPINION_LIKE
        }
        input ListenFeedInput {
            groupId: String
            activityId: String
            postId: String
        }
        type Message {
            msg: String
        }
        type Content {
            version: String
            userName: String
            groupName: String
            activityName: String
            notionTitle: String
            proposalTitle: String
            questionTitle: String
            comment: String
        }
        type Navigation {
            workspaceId: String
            proposalId: String
            groupId: String
            memberId: String
            activityId: String
            activityType: String
            activityCreatorId: String
            postId: String
            postCreatorId: String
            status: String
        }
        type Notification {
            id: String
            rejectId: String
            target: String
            type: ENUM_NOTIFICATION_TYPE
            content: Content
            timestamp: String
            navigation: Navigation
        }
        enum ENUM_PROPOSAL_TYPE {
            SYSTEM
            BUSINESS
        }          
        enum ENUM_PROPOSAL_STATUS {
            PENDING_ASSESS
            ASSESS
            PENDING_VOTE
            VOTE
            REJECT
            CANCEL
            DELETED
            CLOSED
        }
        type subProposal {
            id: ID!
            name: String!
            type: ENUM_PROPOSAL_TYPE!
            status: ENUM_PROPOSAL_STATUS!
            proposalId: String
            creator: ID
        }
        enum ENUM_POST_TYPE {
            SURVEY_RESPONSE
            POLL_RESPONSE
            BOARD_ARTICLE
            COMMENT_ON_ACTIVITY
            COMMENT_ON_POST
            REPLY_ON_COMMENT
        }          
        type subPost {
            id: ID!
            type: ENUM_POST_TYPE
            activity: ID
            parentPost: ID
            writer: ID
        }
    `,
    query: `
        ping: String
    `,
    subscription: `
        listenFeed(input:ListenFeedInput): Notification
        proposalCreated(memberId: ID!): subProposal
        proposalChanged(id: ID!): subProposal
        postCreated(activityId: ID!, memberId: ID!): subPost 
    `,
    resolver: {
        Query: {
            ping: () => ('pong')
        },
        Subscription: {
            listenFeed: {
                subscribe: withFilter(() => {
                    return strapi.services.pubsub.asyncIterator('feed');
                }, (payload, variables) => {
                    if (variables.groupId && variables.groupId !== payload.listenFeed?.navigation?.groupId) {
                        return false;
                    }
                    if (variables.activityId && variables.activityId !== payload.listenFeed?.navigation?.activityId) {
                        return false;
                    }
                    if (variables.postId && variables.postId !== payload.listenFeed?.navigation?.postId) {
                        return false;
                    }
                    return true;
                })
            },
            proposalCreated: {
                subscribe: withFilter(() => {
                    return strapi.services.pubsub.asyncIterator('proposalCreated');
                }, (payload, variables) => {
                    return payload.proposalCreated.creator !== variables.memberId;
                }),
            },
            proposalChanged: {
                subscribe: withFilter(() => {
                    return strapi.services.pubsub.asyncIterator('proposalChanged');
                }, (payload, variables) => {
                    return payload.proposalChanged.id === variables.id;
                }),
            },
            postCreated: {
                subscribe: withFilter(() => {
                    return strapi.services.pubsub.asyncIterator('postCreated');
                }, (payload, variables) => {
                    return (payload.postCreated.activity === variables.activityId
                        && payload.postCreated.writer !== variables.memberId);
                }),
            }
        }
    }
};
