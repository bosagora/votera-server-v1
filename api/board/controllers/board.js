'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      if (data && ctx.state.member) {
        data.creator = ctx.state.member.id;
      }
      entity = await strapi.services.board.create(data, { files });
    } else {
      const data = ctx.request.body;
      if (data && ctx.state.member) {
        data.creator = ctx.state.member.id;
      }
      entity = await strapi.services.board.create(data);
    }
    return sanitizeEntity(entity, { model: strapi.models.board });
  }
};
