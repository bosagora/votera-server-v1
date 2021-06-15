'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async getAgora() {
        const results = await strapi.services.agora.find({ _limit: 1 });
        return results;
    },
};
