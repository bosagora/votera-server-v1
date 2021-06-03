'use strict';

const mongoose = require('mongoose');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async getUserCount(proposalId) {
        const userCounts = await strapi.query('member-role').model.aggregate([
            { $match: { type : {$in: ['USER', 'ADMINISTRATOR']}, scope: 'PROPOSAL', status: 'NORMAL', proposal: new mongoose.Types.ObjectId(proposalId) }},
            { $lookup: { from: 'members', localField: 'member', foreignField: '_id', as: 'members' }},
            { $group: { _id: '$members.user' }},
            { $count: 'user_count' }
        ]);
        if (!userCounts || userCounts.length < 1) {
            return 0;
        }
        return userCounts[0].user_count;
    },
    async processReportOnPost(postId) {
        try {
            let post = await strapi.query('post').findOne({id : postId, status: 'OPEN'});
            if (!post) {
                return null;
            }

            const reports = post.interactions.filter((item) => item.type === 'REPORT_POST');
            if (reports.length < 10) {
                return post;
            }

            // const memberCount = await strapi.query('member-role').model.countDocuments({ type_in: ['USER', 'ADMINISTRATOR'], scope: 'PROPOSAL', status: 'NORMAL', proposal: post.activity.proposal});
            const userCount = await this.getUserCount(post.activity.proposal);
            if (userCount === 0) {
                // 사용자 수 체크에 오류가 있을 가능성이 있음
                return post;
            }

            const shouldProcessed = (userCount > 100) ? reports.length >= Math.floor(userCount / 10): true;
            if (!shouldProcessed) {
                return post;
            }

            post = await strapi.query('post').update(
                { id: post.id },
                { status: 'DELETED' }
            );

            await strapi.query('interaction').update(
                { id_in: reports.map((report) => report.id) },
                { action: [
                    {
                        __component: 'interaction.report',
                        status: 'RESOLVED',
                    }
                ]}
            );

            return post;
        } catch (err) {
            console.log('catch exception : ', err);
            throw err;
        }
    }
};
