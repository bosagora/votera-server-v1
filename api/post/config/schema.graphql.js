'use strict';

module.exports = {
    query: `
        listPosts(sort: String, limit: Int, start: Int, where: JSON): [Post]
    `,
    resolver: {
        Query: {
            listPosts: {
                description: 'List up Post (comment)',
                resolver: 'application::post.post.listPosts',
            },
        },
    }
}