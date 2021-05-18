'use strict';

module.exports = {
    resolver: {
        Mutation: {
            createBoard: {
                description: 'Create Board',
                resolverOf: 'application::board.board.create',
                resolver: async (obj, options, {context}) => {
                    const {input} = options;
                    if (input.data && context.state.member) {
                        input.data.creator = context.state.member.id;
                    }
                    const board = await strapi.services.board.create(input.data);
                    return board ? { board } : 'Failed';
                }
            }
        }
    }
}