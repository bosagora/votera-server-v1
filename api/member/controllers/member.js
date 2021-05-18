'use strict';
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async createValidatorUser(ctx) {
        try {
            const { username, password, nodeName, voterCard } = ctx.request.body.input;
            if (!username) return ctx.badRequest('missing parameter');
            if (!password) return ctx.badRequest('missing parameter');
            if (!nodeName) return ctx.badRequest('missing parameter');
            if (!voterCard) return ctx.badRequest('missing parameter');

            return await strapi.services.member.createValidatorUser(username, password, nodeName, voterCard);
        } catch (error) {
            ctx.badRequest('server internal error');
        }
    },
    async recoverValidatorUser(ctx) {
        try {
            const { password, voterCard } = ctx.request.body.input;
            if (!password) return ctx.badRequest('missing parameter');
            if (!voterCard) return ctx.badRequest('missing parameter');

            return await strapi.services.member.recoverValidatorUser(password, voterCard);
        } catch (error) {
            ctx.badRequest('server internal serror');
        }
    },
    async checkDupUserName(ctx) {
        try {
            const { username } = ctx.request.body;
            if (!username) return ctx.badRequest('missing parameter');
            const result = await strapi.services.member.checkDupUserName(username);
            return result;
        } catch (error) {
            ctx.badRequest('server internal error');
        }
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
                return ctx.badRequest('invalid validator address');
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
                return ctx.badRequest('invalid validator address');
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
        if (!member) {
            throw new Error('entry.notFound');
        } else if (!authorized) {
            throw new Error('Not authorized');
        }

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
        if (!member) {
            throw new Error('entry.notFound');
        } else if (!authorized) {
            throw new Error('Not Authorized');
        }

        const entity = await strapi.services.member.update({ id: ctx.params.id }, { status: 'DELETED' });
        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    async myMembers(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
        }

        const userData = await strapi.query('user', 'users-permissions').findOne({id: user.id});
        return sanitizeEntity(userData, { model: strapi.query('user', 'users-permissions').model });
    }
};
