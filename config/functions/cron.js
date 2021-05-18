'use strict';

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#cron-tasks
 */

module.exports = {
    '0 * * * * *': async () => {
        if (process.env.FEED_ENABLE === 'true') {
            // 피드서버는 사용하지 않음
            return;
        }

        await strapi.services.cronjob.tryLock('lock:batch:proposal', async () => {
            await strapi.services.proposal.batchJob();
        });
    },
};
