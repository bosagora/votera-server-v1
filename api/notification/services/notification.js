/**
 * ! VOTERA Feed Type 별 필요 정보
 * 
    NEW_PROPOSAL
        sourceId : appId
        targets : 모든 유저
        content : proposalTitle
        navigation : groupId
    ASSESS_24HR_DEADLINE
    ASSESS_CLOSED
    VOTING_START
    VOTING_24HR_DEADLINE
    VOTING_CLOSED
        sourceId : group(proposal) Id
        targets : 프로포잘에 조인된 유저
        content : proposalTitle
        navigation : groupId
    NEW_PROPOSAL_NOTICE
        sourceId : group(proposal) Id
        targets : 프로포잘에 조인된 유저
        content : proposalTitle
        navigation : Notice(Article) Id
    NEW_OPINION_COMMENT
    NEW_OPINION_LIKE
        sourceId : OPINION(각 POST) Id , 
        targets : 모든 유저
        content : proposalTitle
        navigation : group(proposal)
 */

// const activity = require('../../activity/controllers/activity');

module.exports = {
    getNotificationPayload: async (result) => {
        const timestamp = result.createdAt;
        const type = result.type;
        // console.log('inner result', result);
        let body, trigger; // body 피드 데이터, trigger 피드를 발생시킨 행위자
        switch (type) {
            case 'NEW_PROPOSAL':
            case 'VOTING_CLOSED':
            case 'VOTING_START':
                const { name, proposalId} = result;
                body = {
                    type: type,
                    content: {
                        proposalTitle: name,
                    },
                    navigation: {
                        memberId: 'appAll',
                        proposalId: proposalId,
                    },
                    timestamp: result?.createdAt,
                };
                break;
            case 'ASSESS_24HR_DEADLINE':
            case 'ASSESS_CLOSED':
            case 'VOTING_24HR_DEADLINE':
                break;
            case 'BOARD_ARTICLE':
                body = {
                    type: 'NEW_PROPOSAL_NOTICE',
                    content: {
                        proposalTitle: result?.activity?.name.split('_')[0],
                    },
                    navigation: {
                        activityId: result?.activity.id,
                        proposalId: result?.activity?.proposal,
                    }
                }
                break;
            case 'COMMENT_ON_POST':
                const { writer, parentPost, activity } = result;
                body = {
                    type: 'NEW_OPINION_COMMENT',
                    content: {
                        userName: writer?.username,
                    },
                    navigation: {
                        postId: parentPost?.id,
                        postCreatorId: parentPost?.writer.toString(),
                        proposalId: activity?.proposal
                    }
                }
                break;
            case 'LIKE_POST':
                const { actor, post } = result;
                body = {
                    type: 'NEW_OPINION_LIKE',
                    content: {
                        userName: actor?.username,
                    },
                    navigation: {
                        postId: post?.id,
                        postCreatorId: post?.writer?.toString(),
                        proposalId: result?.activity?.proposal
                    }
                }
                break;
            default:
                break;
        }

        if (result?.rejectId) body.rejectId = result?.rejectId;

        return { trigger, body: { listenFeed: body } };
    },
};
