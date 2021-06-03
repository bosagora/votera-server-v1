'use strict';

module.exports = {
    definition: `
        input createValidatorUserData {
            username: String!
            password: String!
            nodeName: String!
            voterCard: String!
            pushToken: String
            locale: String
        }
        input createValidatorUserInput {
            data: createValidatorUserData
        }
        type createValidatorUserPayload {
            user: UsersPermissionsUser
            push: Push
        }
        input recoverValidatorUserData {
            password: String!
            voterCard: String!
            pushToken: String
            locale: String
        }
        input recoverValidatorUserInput {
            data: recoverValidatorUserData
        }
        type recoverValidatorUserPayload {
            user: UsersPermissionsUser
            push: Push
        }
        type checkDupUserNamePayload {
            username: String
            duplicated: Boolean
        }
        type MyMembersPayload {
            id: ID!
            username: String!
            members: [Member]
        }
    `,
    query: `
        checkDupUserName(username: String!): checkDupUserNamePayload
        myMembers: MyMembersPayload
    `,
    mutation: `
        createValidatorUser(input: createValidatorUserInput): createValidatorUserPayload
        recoverValidatorUser(input: recoverValidatorUserInput): recoverValidatorUserPayload
    `,
    resolver: {
        Query: {
            checkDupUserName: {
                description: 'Check if username is duplicated',
                resolverOf: 'application::member.member.checkDupUserName',
                resolver: async (obj, options, { context }) => {
                    context.request.body = options;
                    const result = await strapi.controllers.member.checkDupUserName(context);
                    return result;
                },
            },
            myMembers: {
                description: 'Get members of current user',
                resolver: 'application::member.member.myMembers',
            }
        },
        Mutation: {
            createValidatorUser: {
                description: 'Create Validator User',
                resolver: 'application::member.member.createValidatorUser',
            },
            recoverValidatorUser: {
                description: 'Recover Validator User',
                resolver: 'application::member.member.recoverValidatorUser',
            }
        },
    },
};
