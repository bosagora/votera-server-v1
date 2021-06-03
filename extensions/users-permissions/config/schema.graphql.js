'use strict';

const _ = require('lodash');

function checkBadRequest(contextBody) {
    if (_.get(contextBody, 'statusCode', 200) !== 200) {
        const message = _.get(contextBody, 'error', 'Bad Request');
        const exception = new Error(message);
        exception.code = _.get(contextBody, 'statusCode', 400);
        exception.data = contextBody;
        throw exception;
    }
}
  
module.exports = {
    definition: `
        type UsersPermissionsMeEx {
            id: ID!
            username: String!
            email: String!
            confirmed: Boolean
            blocked: Boolean
            role: UsersPermissionsMeRole
            user_feed: UserFeed
        }
        type UsersPermissionsLoginExPayload {
            jwt: String
            user: UsersPermissionsMeEx!
        }
        input UserPasswordInput {
            password: String!
        }
        input updatePasswordInput {
            where: InputID
            data: UserPasswordInput
        }
        input UserPushTokenInput {
            pushId: ID
            pushToken: String
            isActive: Boolean
            locale: String
        }
        input updateUserPushTokenInput {
            where: InputID
            data: UserPushTokenInput
        }
        input AlarmStatus {
            myProposalsNews: Boolean
            likeProposalsNews: Boolean
            newProposalsNews: Boolean
            myCommentsNews: Boolean
            etcNews: Boolean
        }
        input UserAlarmStatusInput {
            alarmStatus: AlarmStatus
        }
        input updateUserAlarmStatusInput {
            where: InputID
            data: UserAlarmStatusInput
        }
    `,
    query: `
        meEx: UsersPermissionsMeEx
    `,
    mutation: `
        loginEx(input: UsersPermissionsLoginInput!): UsersPermissionsLoginExPayload
        updatePassword(input: updatePasswordInput!): updateUserPayload
        updateUserPushToken(input: updateUserPushTokenInput!): updateUserFeedPayload
        updateUserAlarmStatus(input: updateUserAlarmStatusInput!): updateUserFeedPayload
    `,
    resolver: {
        Query: {
            meEx: {
                resolver: 'plugins::users-permissions.user.me'
            },
        },
        Mutation: {
            loginEx: {
                resolverOf: 'plugins::users-permissions.auth.callback',
                resolver: async (obj, options, { context }) => {
                    context.params = {
                        ...context.params,
                        provider: options.input.provider,
                    };
                    context.request.body = _.toPlainObject(options.input);
        
                    await strapi.plugins['users-permissions'].controllers.auth.callback(context);
                    let output = context.body.toJSON ? context.body.toJSON() : context.body;
        
                    checkBadRequest(output);
                    return {
                        user: output.user || output,
                        jwt: output.jwt,
                    };
                }
            },
            updatePassword: {
                description: 'Update password of user',
                resolverOf: 'plugins::users-permissions.user.updatePassword',
                resolver: async (obj, options, { context }) => {
                    const data = await strapi.plugins['users-permissions'].controllers.user.updatePassword(context);
                    return { user: data };
                }
            },
            updateUserPushToken: {
                description: 'Update pushToken and locale of user',
                resolverOf: 'plugins::users-permissions.user.updateUserPushToken',
                resolver: async (obj, options, { context }) => {
                    const data = await strapi.plugins['users-permissions'].controllers.user.updateUserPushToken(context);
                    return { userFeed: data };
                }
            },
            updateUserAlarmStatus: {
                description: 'Update alarm status of user',
                resolverOf: 'plugins::users-permissions.user.updateUserAlarmStatus',
                resolver: async (obj, options, { context }) => {
                    const data = await strapi.plugins['users-permissions'].controllers.user.updateUserAlarmStatus(context);
                    return { userFeed: data };
                }
            }
        }
    }
};
