'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async createValidatorUser(ctx) {
        const { username, password, nodeName, voterCard, pushToken, locale } = ctx.request.body;
        if (!username || !password || !nodeName || !voterCard) return ctx.throw(400, 'missing parameter');

        const result = await strapi.services.member.createValidatorUser(
            username,
            password,
            nodeName,
            voterCard,
            pushToken,
            locale
        );
        if (result) {
            result.user = sanitizeEntity(result.user, { model: strapi.query('user', 'users-permissions').model });
            result.push = sanitizeEntity(result.push, { model: strapi.models.push });
        }
        return result;
    },
    async recoverValidatorUser(ctx) {
        const { password, voterCard, pushToken, locale } = ctx.request.body;
        if (!password || !voterCard) return ctx.throw(400, 'missing parameter');

        const result = await strapi.services.member.recoverValidatorUser(
            password,
            voterCard,
            pushToken,
            locale
        );
        if (result) {
            result.user = sanitizeEntity(result.user, { model: strapi.query('user', 'users-permissions').model });
            result.push = sanitizeEntity(result.push, { model: strapi.models.push });
        }
        return result;
    },
    async checkDupUserName(ctx) {
        const { username } = ctx.request.body;
        if (!username) return ctx.throw(400, 'missing parameter');
        const result = await strapi.services.member.checkDupUserName(username);
        return result;
    },
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
        let entities;
        if (_.has(ctx.query, '_q')) {
            entities = await strapi.services.member.search(ctx.query);
        } else {
            entities = await strapi.services.member.find(ctx.query);
        }

        return sanitizeEntity(entities.filter((entity) => entity.status !== 'DELETED'), { model: strapi.models.member });
    },
    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
        const { query, params } = ctx;
        const entity = await strapi.services.member.findOne({ ...query, id: params.id });
        if (entity.status === 'DELETED') {
            return null;
        }

        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    /**
     * Count records.
     *
     * @return {Number}
     */
    count(ctx) {
        if (_.has(ctx.query, '_q')) {
            return strapi.services.member.countSearch(ctx.query);
        }
        return strapi.services.member.count(ctx.query);
    },
    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            data.user = ctx.state.user.id;
            data.status = 'OPEN';
            data.lastAccessTime = new Date();

            const voter_card = await strapi.services.member.getVoterCardFromInput(data.voterCard);
            if (data.address !== voter_card.validator_address.toString()) {
                return ctx.throw(400, 'invalid validator address');
            }
            const exist_member = await strapi.services.member.checkExistVoterCard(voter_card);
            if (exist_member) {
                entity = await strapi.services.member.update({ id: exist_member.id }, data, { files });
            } else {
                entity = await strapi.services.member.create(data, { files });
            }
        } else {
            const data = ctx.request.body;
            data.user = ctx.state.user.id;
            data.status = 'OPEN';
            data.lastAccessTime = new Date();

            const voter_card = await strapi.services.member.getVoterCardFromInput(data.voterCard);
            if (data.address !== voter_card.validator_address.toString()) {
                return ctx.throw(400, 'invalid validator address');
            }
            const exist_member = await strapi.services.member.checkExistVoterCard(voter_card);
            if (exist_member) {
                entity = await strapi.services.member.update({ id: exist_member.id }, data);
            } else {
                entity = await strapi.services.member.create(data);
            }
        }

        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(ctx.params.id, ctx.state.user);
        if (!member) return ctx.throw(404, 'entry.notFound');
        if (!authorized) return ctx.throw(403, 'not authorized');

        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            await strapi.services.member.checkUpdateMemberParameter(member, data);
            entity = await strapi.services.member.update({ id: ctx.params.id }, data, { files });
        } else {
            const data = ctx.request.body;
            await strapi.services.member.checkUpdateMemberParameter(member, data);
            entity = await strapi.services.member.update({ id: ctx.params.id }, data);
        }

        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(ctx.params.id, ctx.state.user);
        if (!member) return ctx.throw(404, 'entry.notFound');
        if (!authorized) return ctx.throw(403, 'not authorized');

        const entity = await strapi.services.member.update({ id: ctx.params.id }, { status: 'DELETED' });
        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    async myMembers(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.throw(400, 'not authorized');

        const userData = await strapi.query('user', 'users-permissions').findOne({id: user.id});
        return sanitizeEntity(userData, { model: strapi.query('user', 'users-permissions').model });
    }
};
