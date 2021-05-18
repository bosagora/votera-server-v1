const { gql } = require('apollo-server-koa');

const Type = gql`
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
`;

module.exports = Type;
