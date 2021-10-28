const boasdk = require('boa-sdk-ts');
const { BOASodium } = require('boa-sodium-ts');

require('dotenv').config();

const fn = require('./util/appFunction');
const dn = require('./util/dbFunction');

const { TEST_VALIDATOR_ADDRESS } = require('./util/config');

const TEST_IDENTIFIER = process.env.TEST_IDENTIFIER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TEST_PROPOSAL_ID = process.env.TEST_PROPOSAL_ID;

async function main() {
    try {
        await dn.dbOpen();

        // login
        await fn.loginEx(TEST_IDENTIFIER, TEST_PASSWORD, TEST_VALIDATOR_ADDRESS);

        // get member id
        const member = await dn.dbGetMember(TEST_VALIDATOR_ADDRESS);
        const testMemberId = member._id.toString();

        let proposal = await fn.getProposalById(TEST_PROPOSAL_ID);
        console.log('proposal = ', proposal);

        // get discussion board
        const discussionBoard = await fn.getDiscussionBoard(proposal);
        console.log('discussionBoard = ', discussionBoard);

        // add test posts to be reported
        const tobeReported = await fn.createDiscussionPost(discussionBoard, 'To Be reported', testMemberId);
        console.log('tobeReported = ', tobeReported);

        // get discussion posts
        let discussionPosts = await fn.getDiscussionPosts(discussionBoard);
        console.log('discussionPosts = ', discussionPosts);
        // expect discussionPosts[0] === tobeReported

        // toggle like
        const resLike = await fn.runToggleLike(tobeReported, true, testMemberId);
        console.log('resLike = ', resLike);

        discussionPosts = await fn.getDiscussionPosts(discussionBoard);
        console.log('discussionPosts = ', discussionPosts);

        // report posts
        const resReportPost = await fn.reportPost(discussionPosts[0], discussionBoard, proposal, testMemberId);
        console.log('resReportPost = ', resReportPost);

        discussionPosts = await fn.getDiscussionPosts(discussionBoard);
        console.log('discussionPosts = ', discussionPosts);

        const reportedPosts = await fn.getReportedPosts(TEST_PROPOSAL_ID);
        console.log('reportedPosts = ', reportedPosts);

    } catch (err) {
        console.log('catch error : ', err);
    } finally {
        await dn.dbClose();
    }
}

boasdk.SodiumHelper.assign(new BOASodium());
boasdk.SodiumHelper.init()
    .then(async () => {
        await main();
    })
    .catch((err) => {
        console.log('catch error : ', err);
    })
