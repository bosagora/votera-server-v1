'use strict';

const { sanitizeEntity } = require('strapi-utils');

const sanitizeUser = user =>
    sanitizeEntity(user, {
        model: strapi.query('user', 'users-permissions').model,
    });

module.exports = {
    async updatePassword(ctx) {
        const { id } = ctx.params;
        const { password } = ctx.request.body;
        if (!id) {
            return ctx.throw(400, 'missing.id');
        } else if (id !== ctx.state.user?.id) {
            return ctx.throw(403, 'unauthorized');
        }
        if (!password) return ctx.throw(400, 'missing.password');

        const data = await strapi.plugins['users-permissions'].services.user.edit({ id }, { password });

        return sanitizeUser(data);
    },
    async updateUserPushToken(ctx) {
        const { id } = ctx.params;
        const { pushId, pushToken, isActive, locale } = ctx.request.body;

        if (!id) {
            return ctx.throw(400, 'missing.id');
        } else if (id !== ctx.state.user?.id) {
            return ctx.throw(403, 'unauthorized');
        }
        if (!pushId && !pushToken && !locale) {
            return ctx.throw(400, 'missing.parameter');
        }
        if (pushId && (!pushToken && typeof isActive === undefined)) {
            return ctx.throw(400, 'missing.parameter');
        }

        const userFeed = await strapi.services['user-feed'].updateUserPushToken(
            ctx.state.user.user_feed,
            pushId,
            pushToken,
            isActive,
            locale,
        );

        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    },
    async updateUserAlarmStatus(ctx) {
        const { id } = ctx.params;
        const { alarmStatus } = ctx.request.body;

        if (!id) {
            return ctx.throw(400, 'missing.id');
        } else if (id !== ctx.state.user?.id) {
            return ctx.throw(403, 'unauthorized');
        }
        if (!alarmStatus) {
            return ctx.throw(400, 'missing.parameter');
        }

        const userFeed = await strapi.services['user-feed'].updateUserAlarmStatus(
            ctx.state.user.user_feed,
            alarmStatus
        );

        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    }
};
