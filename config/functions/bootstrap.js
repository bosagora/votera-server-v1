'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

module.exports = async () => {
    await strapi.services.boaclient.initialize();
    await strapi.services.pubsub.initialize();
    await strapi.services.feedclient.initialize();
    await strapi.services.cronjob.initialize();
};
