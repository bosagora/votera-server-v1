'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async find(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.activity.search(ctx.query, []);
        } else {
            entities = await strapi.services.activity.find(ctx.query, []);
        }

        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.activity }));
    },
    /**
     * Summarize the result of an activity counting all response posts
     * @param {*} ctx
     */
    async summarize(ctx) {
        const { id } = ctx.params;
        if (!id) return;
        const result = await strapi.services.activity.summarize(id);
        return result;
    },
    async create(ctx) {
        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            if (data && ctx.state.member) {
                data.creator = ctx.state.member.id;
            }
            entity = await strapi.services.activity.create(data, { files });
        } else {
            const data = ctx.request.body;
            if (data && ctx.state.member) {
                data.creator = ctx.state.member.id;
            }
            entity = await strapi.services.activity.create(data);
        }
        return sanitizeEntity(entity, { model: strapi.models.activity });
    }
};
