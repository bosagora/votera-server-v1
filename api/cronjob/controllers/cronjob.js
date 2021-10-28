'use strict';

module.exports = {
    async update(ctx) {
        console.log('call cronJob.update()');
        await strapi.services.cronjob.tryLock('lock:batch:proposal', async () => {
            await strapi.services.proposal.batchJob();
            await strapi.services.feeds.batchJob();
        });
        const blockHeight = await strapi.services.boaclient.getCurrentBlockHeight();
        return `${blockHeight}`;
    }
};
