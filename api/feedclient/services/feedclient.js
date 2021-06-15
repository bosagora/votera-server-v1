'use strict';

const fcm = require('../../../src/util/fcm');

const selectNewProposalsNews = async (creator, maxUserFeed) => {
    if (maxUserFeed) {
        userFeeds = await strapi.query('user-feed').find({
            newProposalsNews: true,
            user_ne: creator,
            id_gt: maxUserFeed,
            _sort: 'id'
        });
    } else {
        userFeeds = await strapi.query('user-feed').find({
            newProposalsNews: true,
            user_ne: creator,
            _sort: 'id'
        });
    }
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    const lastUserFeed = userFeeds[userFeeds.length - 1].id;
    if (!lastUserFeed) {
        return null;
    }

    return { lastUserFeed, userFeeds };
}

const selectLikeProposalsNews = async (target, maxFollow) => {
    let follows;
    if (maxFollow) {
        follows = await strapi.query('follow').find({
            target,
            isFeedActive: true,
            type: 'PROPOSAL_JOIN',
            id_gt: maxFollow,
            _sort: 'id'
        });
    } else {
        follows = await strapi.query('follow').find({
            target,
            isFeedActive: true,
            type: 'PROPOSAL_JOIN',
            _sort: 'id'
        });
    }
    if (!follows || follows.length === 0) {
        return null;
    }

    const lastFollow = follows[follows.length - 1].id;
    if (!lastFollow) {
        return null;
    }

    const ids = follows
        .map((follow) => follow.user_feed)
        .filter((user_feed) => user_feed.likeProposalsNews)
        .map((user_feed) => user_feed.id);
    if (!ids || ids.length === 0) {
        return { lastFollow, userFeeds: null };
    }

    const userFeeds = await strapi.query('user_feed').find({
        id_in: ids
    });
    if (!userFeeds || userFeeds.length === 0) {
        return { lastFollow, userFeeds: null };
    }

    return { lastFollow, userFeeds };
}

const selectMyProposalsNews = async (target) => {
    const follows = await strapi.query('follow').find({
        target,
        isFeedActive: true,
        type: 'PROPOSAL_CREATE',
    });
    if (!follows || follows.length === 0) {
        return null;
    }

    const ids = follows
        .map((follow) => follow.user_feed)
        .filter((user_feed) => user_feed.myProposalsNews)
        .map((user_feed) => user_feed.id);
    if (!ids || ids.length === 0) {
        return null;
    }

    const userFeeds = await strapi.query('user-feed').find({
        id_in: ids
    });
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    return userFeeds;
}

const selectMyCommentsNews = async (target) => {
    const follows = await strapi.query('follow').find({
        target,
        isFeedActive: true,
        type: 'POST',
    });
    if (!follows || follows.length === 0) {
        return null;
    }

    const ids = follows
        .map((follow) => follow.user_feed)
        .filter((user_feed) => user_feed.myCommentsNews)
        .map((user_feed) => user_feed.id);
    if (!ids || ids.length === 0) {
        return null;
    }

    const userFeeds = await strapi.query('user-feed').find({
        id_in: ids
    });
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    return userFeeds;
}

function makeFeedsProposal(proposal, type) {
    return {
        type,
        content: {
            proposalTitle: proposal.name,
        },
        navigation: {
            proposalId: proposal.id,
        },
        isRead: false,
    };
}

function makePayloadProposal(proposal, type) {
    let en_title, en_body, ko_title, ko_body;

    switch(type) {
        case 'NEW_PROPOSAL':
            ko_title = '새로운 제안이 만들어졌어요!';
            ko_body = `${proposal.name} 이 등록되었으니 확인해 보세요.`;
            en_title = 'New proposal';
            en_body = `${proposal.name} has enrolled. Please check it out!`;
            break;
        case 'ASSESS_PENDING':
            ko_title = '제안수수료 입금 안내';
            ko_body = `${proposal.name} 의 사전 평가를 시작하시려면 제안수수료를 24시간 내에 입금해 주시기 바랍니다.`;
            en_title = 'Proposal fee deposit required';
            en_body = `Please deposit proposal fee of ${proposal.name}. 24 hours left to begin assessment of proposal feasibility`;
            break;
        case 'ASSESS_24HR_DEADLINE':
            ko_title = '사전 평가 종료 전 24시간';
            ko_body = `${proposal.name} 의 사전 평가 종료까지 24시간 남았습니다! 종료전 참여해보세요.`;
            en_title = '24 hours left to assess proposal feasibility';
            en_body = `24 hours left to access ${proposal.name}'s feasibility assessment! Please join in before it ends.`;
            break;
        case 'ASSESS_CLOSED':
            ko_title = '사전평가 종료';
            ko_body = `${proposal.name} 사전평가가 종료되었습니다. 평가 결과를 확인해보세요.`;
            en_title = 'feasibility assessment closed';
            en_body = `${proposal.name}'s feasibility assessment has closed. Please check out the results.`;
            break;
        case 'VOTING_START':
            ko_title = '투표 시작';
            ko_body = `${proposal.name} 의 투표가 시작되었으니 투표에 참여해보세요.`;
            en_title = 'vote opening';
            en_body = `${proposal.name}'s voting is jsut started! Please join in :)`;
            break;
        case 'VOTING_PENDING':
            ko_title = '투표비 입금 안내';
            ko_body = `${proposal.name} 의 투표를 시작하시면 투표비를 24시간 내에 입금해 주시기 바랍니다.`;
            en_title = 'Vote fee deposit required';
            en_body = `Please deposit vote fee of ${proposal.name}. 24 hours left to begin vote`;
            break;
        case 'VOTING_24HR_DEADLINE':
            ko_title = '투표 종료 전 24시간';
            ko_body = `${proposal.name} 의 투표 종료까지 24시간 남았습니다. 놓치치 말고 투표하세요.`;
            en_title = '24 hours left to vote';
            en_body = `24 hours left to access ${proposal.name}'s voting! Please don't miss out on your vote.`;
            break;
        case 'VOTING_CLOSED':
            ko_title = '투표 종료';
            ko_body = `${proposal.name} 투표가 종료되었습니다. 결과를 확인해보세요.`;
            en_title = 'Vote closed';
            en_body = `${proposal.name}'s voting has ended. Please check out the results.`;
            break;
        case 'NEW_PROPOSAL_NOTICE':
            ko_title = '제안 공지 등록';
            ko_body = `${proposal.name} 에 새로운 공지가 등록되었습니다. 확인해보세요.`;
            en_title = 'New proposal notice';
            en_body = `${proposal.name}' new notice has posted. Please check it out!`;
            break;
        default:
            return null;
    }
    return {
        payload_en: {
            title: en_title,
            body: en_body,
        },
        payload_ko: {
            title: ko_title,
            body: ko_body,
        },
    }
}

function makeFeedsComment(activity, memberName, type) {
    return {
        type,
        content: {
            userName: memberName,
        },
        navigation: {
            activityId: activity,
        },
        isRead: false,
    }
}

function makePayloadComment(activity, memberName, type) {
    let en_title, en_body, ko_title, ko_body;
    switch(type) {
        case 'NEW_OPINION_COMMENT':
            ko_title = '의견에 답글 달림';
            ko_body = `${memberName} 님이 당신의 의견에 댓글을 남겼습니다.`;
            en_title = 'New comment';
            en_body = `${memberName} commented on your opinion.`;
            break;
        case 'NEW_OPINION_LIKE':
            ko_title = '좋아요 받음';
            ko_body = `${memberName} 님이 당신의 의견을 추천했습니다.`;
            en_title = 'New like';
            en_body = `${memberName} recommended your opinion.`;
            break;
        default :
            return null;
    }

    return {
        payload_en: {
            title: en_title,
            body: en_body,
        },
        payload_ko: {
            title: ko_title,
            body: ko_body,
        },
    }
}

const saveFeeds = async (userFeeds, feed) => {
    const targets = userFeeds.map((userFeed) => {
        return { ...feed, target: userFeed.user.user_feed };
    });
    Promise.all(targets.map(target => strapi.query('feeds').create(target)));
    /*
    await strapi.query('feeds').model.insertMany(targets, function(error, docs) {
        if (error) {
            strapi.log.warn({error}, 'saveFeeds exception');
        }
    });
    */
};

const sendNotification = (userFeeds, payload_ko, payload_en) => {
    const pushes_en = userFeeds
        .filter((userFeed) => !userFeed.locale || userFeed.locale.indexOf('ko') === -1)
        .map((userFeed) => userFeed.pushes.filter((push) => push.isActive))
        .flat();
    if (pushes_en && pushes_en.length > 0) {
        const message_en = {...payload_en, tokens: pushes_en.map((push) => push.token)};
        fcm.sendToDevices(message_en)
            .catch((err) => {
                strapi.log.warn({err}, 'fcm.sendToDevices exception');
            });
    }

    const pushes_ko = userFeeds
        .filter((userFeed) => userFeed.locale && userFeed.locale.indexOf('ko') !== -1)
        .map((userFeed) => userFeed.pushes.filter((push) => push.isActive))
        .flat();
    if (pushes_ko && pushes_ko.length > 0) {
        const message_ko = {...payload_ko, tokens: pushes_ko.map((push) => push.token)};
        fcm.sendToDevices(message_ko)
            .catch((err) => {
                strapi.log.warn({err}, 'fcm.sendToDevices exception');
            });
    }
};

const processNewProposal = async (proposal, type) => {
    const feed = makeFeedsProposal(proposal, type);
    if (!feed) {
        return;
    }
    const payloads = makePayloadProposal(proposal, type);
    if (!payloads) {
        return;
    }

    const creatorId = proposal.creator.user;

    let userList = await selectNewProposalsNews(creatorId);
    while (userList) {
        if (userList.userFeeds) {
            await saveFeeds(userList.userFeeds, feed);
            sendNotification(userList.userFeeds, payloads.payload_ko, payloads.payload_en);
        }

        userList = await selectNewProposalsNews(creatorId, userList.maxUserFeed);
    }
};

const processProposal = async (proposal, type, myProcess, likeProcess) => {
    const feed = makeFeedsProposal(proposal, type);
    if (!feed) {
        return;
    }
    const payloads = makePayloadProposal(proposal, type);
    if (!payloads) {
        return;
    }

    if (myProcess) {
        const userFeeds = await selectMyProposalsNews(proposal.id);
        if (userFeeds) {
            await saveFeeds(userFeeds, feed);
            sendNotification(userFeeds, payloads.payload_ko, payloads.payload_en);
        }
    }
    if (likeProcess) {
        let userList = await selectLikeProposalsNews(proposal.id);
        while (userList) {
            if (userList.userFeeds) {
                await saveFeeds(userList.userFeeds, feed);
                sendNotification(userList.userFeeds, payloads.payload_ko, payloads.payload_en);
            }

            userList = await selectLikeProposalsNews(proposal.id, userList.lastFollow);
        }
    }
};

const processComment = async (target, activity, memberName, type) => {

    const feed = makeFeedsComment(activity, memberName, type);
    if (!feed) {
        return;
    }
    const payloads = makePayloadComment(activity, memberName, type);
    if (!payloads) {
        return;
    }

    const userFeeds = await selectMyCommentsNews(target);
    if (!userFeeds) {
        return;
    }

    await saveFeeds(userFeeds, feed);
    sendNotification(userFeeds, payloads.payload_ko, payloads.payload_en);
};

module.exports = {
    async onProposalCreated(proposal) {
        console.log('feedclient.onProposalCreated proposal = ', proposal);
        // proposal.creator.user : creator user id
        const type = 'NEW_PROPOSAL';
        // newProposalsNews: true
        await processNewProposal(proposal, type);
    },
    async onProposalUpdated(proposal) {
        console.log('feedclient.onProposalUpdated proposal=', proposal);
        let type;
        // myProposalsNews: true
        // likeProposalsNews: true
        switch (proposal.status) {
            case 'PENDING_VOTE': // 사전평가 종료
                type = 'ASSESS_CLOSED';
                break;
            case 'VOTE':
                type = 'VOTING_START';
                break;
            case 'CLOSED':
                type = 'VOTING_CLOSED';
                break;
            default:
                return;
        }

        await processProposal(proposal, type, true, true);
    },
    async onProposalTimeAlarm(proposal) {
        console.log('feedclient.onProposalUpdated proposal=', proposal);
        let type;
        let likeProposalsNews = false
        switch (proposal.status) {
            case 'PENDING_ASSESS':
                type = 'ASSESS_PENDING';
                break;
            case 'ASSESS':
                type = 'ASSESS_24HR_DEADLINE';
                likeProposalsNews = true;
                break;
            case 'PENDING_VOTE':
                type = 'VOTING_PENDING';
                break;
            case 'VOTE':
                type = 'VOTING_24HR_DEADLINE';
                likeProposalsNews = true;
                break;
            default:
                return;
        }

        await processProposal(proposal, type, true, likeProposalsNews);
    },
    async onPostCreated(post) {
        let type;
        let proposal;
        switch (post.type) {
            case 'BOARD_ARTICLE':
                type = 'NEW_PROPOSAL_NOTICE';
                // likeProposalsNews: true
                proposal = await strapi.query('proposal').findOne({id: post.activity.proposal});
                break;
            case 'COMMENT_ON_POST':
                type = 'NEW_OPINION_COMMENT';
                // myCommentsNews: true
                break;
            default:
                return;
        }

        if (type === 'NEW_OPINION_COMMENT') {
            await processComment(
                post.parentPost.id,
                post.activity.id,
                post.writer.username,
                type
            );
        } else if (type === 'NEW_PROPOSAL_NOTICE') {
            await processProposal(proposal, type, false, true);
        }
    },
    async onInteractionCreated(interaction) {
        console.log('feedclient.onInteractionCreated interaction=', interaction);
        let type;
        switch (interaction.type) {
            case 'LIKE_POST':
                type = 'NEW_OPINION_LIKE';
                // myCommentsNews: true
                break;
            default:
                return;
        }

        await processComment(
            interaction.post.id,
            interaction.post.activity,
            interaction.actor.username,
            type
        );
    }
};
