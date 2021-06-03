'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

function sanitizePost(entity) {
    if (entity.status === 'DELETED') {
        if (entity.content) delete entity.content;
    }
    return sanitizeEntity(entity, { model: strapi.models.post });
}

module.exports = {
    async find(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.post.search(ctx.query, []);
        } else {
            entities = await strapi.services.post.find(ctx.query, []);
        }

        return entities.map(entity => sanitizePost(entity));
    },
    async listPosts(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.post.search(ctx.query, ['childPosts']);
        } else {
            entities = await strapi.services.post.find(ctx.query, ['childPosts']);
        }

        return entities.map(entity => sanitizePost(entity));
    },
    async create(ctx) {
        let post;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            const { writer } = data ? data : {};
            await strapi.services.member.authorizeMember(writer, ctx.state.user, ctx);

            post = await strapi.services.post.create(data, { files });
        } else {
            const { writer } = ctx.request.body;
            await strapi.services.member.authorizeMember(writer, ctx.state.user, ctx);

            post = await strapi.services.post.create(ctx.request.body);
        }
        if (post && (post.type !== 'SURVEY_RESPONSE' && post.type !== 'POLL_RESPONSE')) {
            strapi.services.follow.createMyComment(ctx.state.user.user_feed, post.id)
                .catch((err) => {
                    strapi.log.warn({err, post}, 'follow.createMyComment error');
                });
        }
        return sanitizePost(post);
    },
    async update(ctx) {
        let post;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            const { writer } = data ? data : {};
            await strapi.services.member.authorizeMember(writer, ctx.state.user, ctx);

            post = await strapi.services.post.update({ id: ctx.params.id, writer }, data, { files });
        } else {
            const { writer } = ctx.request.body;
            await strapi.services.member.authorizeMember(writer, ctx.state.user, ctx);
            
            post = await strapi.services.post.update({ id: ctx.params.id, writer }, ctx.request.body);
        }
        return sanitizePost(post);
    }
};
