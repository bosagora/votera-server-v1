'use strict';

const mongoose = require('mongoose');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async toggleLike(ctx) {
        // type : Event | Article | Proposal | Comment
        const { isLike, postId, memberId } = ctx.request.body.input;
        try {
            const interactions = await strapi.services.interaction.find({
                type: 'LIKE_POST',
                post: postId,
                actor: memberId ? memberId : ctx.state.member.id,
            });
            let interaction;
            if (isLike) {
                // 좋아요
                if (interactions.length !== 0) {
                    // Like가 있는데, Like 요청 => 그대로 둔다
                } else {
                    // 생성
                    interaction = await strapi.services.interaction.create({
                        type: 'LIKE_POST',
                        action: [
                            {
                                __component: 'interaction.like',
                                type: 'LIKE',
                            },
                        ],
                        post: postId,
                        actor: memberId ? memberId : ctx.state.member.id,
                    });
                }
            } else {
                //좋아요 취소
                if (interactions.length !== 0) {
                    // 삭제
                    if (!postId) {
                        console.log('toggleLike Delete Error', postId);
                    } else {
                        interaction = await strapi.services.interaction.delete({ id: interactions[0].id });
                    }
                } else {
                    // Like가 없는데, Like 제가 요청 => 그대로 둔다
                }
            }
            return { isLike, interaction };
        } catch (e) {
            console.log('Error occur', e);
            return null;
        }
    },
    async listReportedPosts(proposalId, userId) {
        const proposal = await strapi.query('proposal').findOne({proposalId});
        if (!proposal) {
            return [];
        }

        const results = await strapi.query('interaction').model.aggregate([
            { $match: { type: 'REPORT_POST', user: new mongoose.Types.ObjectId(userId), proposal: proposal._id } },
            { $lookup: { from: 'components_interaction_reports', localField: 'action.ref', foreignField: '_id', as: 'action_docs'}},
            { $match: { 'action_docs.status': 'UNRESOLVED' }},
            { $project: { action_docs: 0 }}
        ]);
        return results.map((result) => result.post);
    },
    async createReportPost(postId, activityId, proposalId, memberId, user) {
        // check duplication
        const found = await strapi.query('interaction').findOne({
            type: 'REPORT_POST',
            activity: activityId,
            post: postId,
            proposal: proposalId,
            user: user.id
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('interaction').create({
            type: 'REPORT_POST',
            activity: activityId,
            post: postId,
            actor: memberId,
            proposal: proposalId,
            user: user.id,
            action: [{
                __component: 'interaction.report',
                status: 'UNRESOLVED',
            }]
        });

        if (result) {
            await strapi.services.post.processReportOnPost(postId);
        }

        return result;
    }
};
