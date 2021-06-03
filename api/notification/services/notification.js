'use strict';

module.exports = {
    async onProposalCreated(proposal) {
        console.log('notification.onProposalCreated proposal = ', proposal);
        strapi.services.feedclient.onProposalCreated(proposal)
            .catch((err) => {
                strapi.log.warn({err, proposal}, 'feedclient.onProposalCreated exception');
            });
    },
    async onProposalUpdated(proposal) {
        console.log('notification.onProposalUpdated proposal=', proposal);
        strapi.services.feedclient.onProposalUpdated(proposal)
            .catch((err) => {
                strapi.log.warn({err, proposal}, 'feedclient.onProposalUpdated exception');
            });
    },
    async onProposalTimeAlarm(proposal) {
        if (proposal.timeAlarm_notified) {
            return;
        }
        console.log('notification.onProposalUpdated proposal=', proposal);
        await strapi.query('proposal').update({id: proposal.id}, {timeAlarm_notified: true});
        strapi.services.feedclient.onProposalTimeAlarm(proposal)
            .catch((err) => {
                strapi.log.warn({err, proposal}, 'feedclient.onProposalTimeAlarm exception');
            });
    },
    async onPostCreated(post) {
        if (post.type === 'COMMENT_ON_POST' || post.type === 'REPLY_ON_COMMENT') {
            if (post.writer.id === post.parentPost.writer) {
                // 자기 글에 자답 했을 경우 무시
                return;
            }
        }
        console.log('notification.onPostCreated post=', post);
        strapi.services.feedclient.onPostCreated(post)
            .catch((err) => {
                strapi.log.warn({err, post}, 'feedclient.onPostCreated exception');
            })
    },
    async onInteractionCreated(interaction) {
        if (interaction.type === 'LIKE_POST') {
            if (interaction.actor.id === interaction.post.writer) {
                // 자기 글에 자추했을 경우 무시
                return;
            }
        }
        strapi.services.feedclient.onInteractionCreated(interaction)
            .catch((err) => {
                strapi.log.warn({err, interaction}, 'feedclient.onInteractionCreated exception');
            });
    }
};
