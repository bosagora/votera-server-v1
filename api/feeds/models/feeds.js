'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
    lifecycles: {
        async afterFind(result) {
            // console.log('result', result);
        },
        // async afterUpdate() {
        //     console.log('')
        // }
    }
};
