'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            if (!data.name) {
                data.name = 'No name';
            }
            if (!data.effectivedate) {
                // todo: datetime field is not set by trigger.
                data.effectivedate = new Date();
            }
        },
    },
};
