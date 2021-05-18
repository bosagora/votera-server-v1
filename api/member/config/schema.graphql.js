'use strict';

module.exports = {
    definition: `
        input createValidatorUserInput {
            username: String!
            password: String!
            nodeName: String!
            voterCard: String!
        }
        input recoverValidatorUserInput {
            password: String!
            voterCard: String!
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
        createValidatorUser(input: createValidatorUserInput): createUserPayload
        recoverValidatorUser(input: recoverValidatorUserInput): createUserPayload
    `,
    resolver: {
        Query: {
            checkDupUserName: {
                description: 'Check if username is duplicated',
                resolverOf: 'application::member.member.checkDupUserName',
                resolver: async (obj, options, { context }) => {
                    const username = options.username;
                    if (!username) throw new Error('missing.username');
                    const result = await strapi.services.member.checkDupUserName(username);
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
                resolverOf: 'application::member.member.createValidatorUser',
                resolver: async (obj, options, { context }) => {
                    const { username, password, nodeName, voterCard } = options.input;
                    
                    const result = await strapi.services.member.createValidatorUser(
                        username,
                        password,
                        nodeName,
                        voterCard,
                    );
                    return { user: result };
                },
            },
            recoverValidatorUser: {
                description: 'Recover Validator User',
                resolverOf: 'application::member.member.createValidatorUser',
                resolver: async (obj, options, { context }) => {
                    const { password, voterCard } = options.input;
                    
                    const result = await strapi.services.member.recoverValidatorUser(
                        password,
                        voterCard,
                    );
                    return { user: result };
                },
            }
        },
    },
};
