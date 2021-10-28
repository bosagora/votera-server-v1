const boasdk = require('boa-sdk-ts');
const { BOASodium } = require('boa-sodium-ts');

require('dotenv').config();

const moment = require('moment');

const fn = require('./util/appFunction');
const dn = require('./util/dbFunction');
const ln = require('./util/linkFunction');
const qn = require('./util/qrFunction');
const { TEST_VALIDATOR_SEED, TEST_VALIDATOR_ADDRESS, TEST_VALIDATOR_PREIMAGE } = require('./util/config');

const TEST_IDENTIFIER = process.env.TEST_IDENTIFIER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
// const TEST_PROPOSAL_ID = '';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeTestAssessPeriod() {
    return {
        begin: moment().add(1, 'day').format('YYYY-MM-DD'),
        end: moment().add(7, 'day').format('YYYY-MM-DD'),
    };
}

function makeTestVotePeriod() {
    return {
        begin: moment().add(15, 'day').format('YYYY-MM-DD'),
        end: moment().add(18, 'day').format('YYYY-MM-DD'),
    };
}

async function main(businessProposal) {
    try {
        await dn.dbOpen();

        // login
        await fn.loginEx(TEST_IDENTIFIER, TEST_PASSWORD, TEST_VALIDATOR_ADDRESS);

        // get member id
        const member = await dn.dbGetMember(TEST_VALIDATOR_ADDRESS);
        const testMemberId = member._id.toString();
        
        // create business proposal
        businessProposal.assessPeriod = makeTestAssessPeriod();
        businessProposal.votePeriod = makeTestVotePeriod();

        let proposal;
        if (typeof TEST_PROPOSAL_ID !== 'undefined' && TEST_PROPOSAL_ID) {
            proposal = await fn.getProposalById(TEST_PROPOSAL_ID);
        } else {
            proposal = await fn.createProposal({...businessProposal, creator: testMemberId});
        }
        console.log('proposal = ', proposal);

        const proposalId = proposal.proposalId;

        let rawProposal = await dn.dbGetProposal(proposal.id);
        console.log('rawProposal = ', rawProposal);

        // add proposal notice
        const noticeBoard = await fn.getNoticeBoard(proposal);
        const noticePost = await fn.createNoticePost(noticeBoard, 'TestTile', 'TestNoticeText', [], testMemberId);
        console.log('noticePost = ', noticePost);

        // add proposal discussion
        const discussionBoard = await fn.getDiscussionBoard(proposal);
        const discussionPost = await fn.createDiscussionPost(discussionBoard, 'TestDiscussion', testMemberId);
        console.log('discussionPost = ', discussionPost);

        // add reply comment to discussion post
        const replyPost = await fn.createReplyPost(discussionBoard, discussionPost, 'TestReply', testMemberId);
        console.log('replyPost = ', replyPost);

        // get proposal fee data
        const proposalFee = await fn.getProposalFee(proposal.id);
        console.log('proposalFee data = ', proposalFee);

        // post proposal assessment
        const assessActivity = await fn.getAssessActivity(proposal);

        // run wallet (proposal fee)
        if (proposal.status === 'PENDING_ASSESS') {
            const linkData = fn.makeProposalFeeDataLinkData(proposal.proposalId, proposalFee);
            await ln.openProposalFeeLink(linkData);

            // change proposal status PENDING_ASSESS => ASSESS
            await fn.runCronBatch();
        }

        proposal = await fn.getProposalById(proposalId);
        // expect proposal.status === 'ASSESS'

        // change asset period
        const assessPeriod = {
            begin: moment().add(-1, 'day').format('YYYY-MM-DD'),
            end: moment().add(1, 'day').format('YYYY-MM-DD'),
        };
        await dn.dbUpdateCommonPeriod(rawProposal.assessPeriod[0], assessPeriod);

        // add assess post
        const assessResult = [
            { key: 0, value: 9 },
            { key: 1, value: 9 },
            { key: 2, value: 8 },
            { key: 3, value: 8 },
            { key: 4, value: 7 }
        ];
        await fn.createAssessPost(assessActivity, assessResult, testMemberId);

        // get summary of assess
        const resSummary = await fn.getSummarize(assessActivity.id);
        console.log('summarize = ', resSummary);

        // change assess period 
        assessPeriod.begin = moment().add(-2, 'day').format('YYYY-MM-DD');
        assessPeriod.end = moment().add(-1, 'day').format('YYYY-MM-DD');
        await dn.dbUpdateCommonPeriod(rawProposal.assessPeriod[0], assessPeriod);

        // wait proposal status change ASSESS => PENDING_VOTE
        let blockHeight = await fn.runCronBatch();

        proposal = await fn.getProposalById(proposalId);
        // expect proposal.status === 'PENDING_VOTE'

        // get VoteFee
        const voteFee = await fn.getVoteFee(proposal.id);
        console.log('voteFee = ', voteFee);

        // run wallet (voteFee)
        if (proposal.status === 'PENDING_VOTE') {
            let linkData = (proposal.type === 'BUSINESS') ? fn.makeFundProposalDataLinkData(voteFee.proposal) : fn.makeSystemProposalDataLinkData(voteFee.proposal);
            await ln.openProposalVoteFeeLink(linkData);
            blockHeight = await fn.runCronBatch();
            // await sleep(6000);
        }

        // change vote period
        const proposalVotePeirod = {
            vote_start_height : blockHeight - 1,
            vote_end_height : blockHeight + 2,
        };
        await dn.dbUpdateProposal(proposal.id, proposalVotePeirod);

        // wait proposal status change PENDING_VOTE => VOTE
        await fn.runCronBatch();

        proposal = await fn.getProposalById(proposalId);
        // expect proposal.status === 'VOTE';

        const voteActivity = await fn.getVoteActivity(proposal);
        
        if (proposal.status === 'VOTE') {
            // get qrcode validatorVote
            const qrcodeVote = qn.makeQrcodeVote(TEST_VALIDATOR_SEED, TEST_VALIDATOR_PREIMAGE, fn.encryptionBlockHeight(proposal));
            const validatorVote = fn.parseValidatorVote(qrcodeVote);

            // get voterLogin 
            const qrcodeLogin = qn.makeQrcodeLogin(TEST_VALIDATOR_SEED);
            const validatorLogin = fn.parseValidatorLogin(qrcodeLogin);

            const voteData = fn.makeVoteLinkData(proposalId, validatorLogin, validatorVote, boasdk.BallotData.YES, fn.getVoteSequence());
            await ln.openProposalVoteLink(voteData);
        }

        const votePost = await fn.createVotePost(voteActivity, boasdk.BallotData.YES, testMemberId);
        console.log('votePost = ', votePost);

        // await vote end and verify proposal.status === CLOSED

    } catch (err) {
        console.log('catch error', err);
    } finally {
        await dn.dbClose();
    }
}

const testBusinessProposal = {
    name: 'BusinessTest1',
    description: 'Business1Description',
    type: 'BUSINESS',
    status: 'PENDING_ASSESS',
    fundingAmount: '100000000',
    // assessPeriod: {
    //     begin: '2021-08-25',
    //     end: '2021-08-26'
    // },
    // votePeriod: {
    //     begin: '2021-08-26',
    //     end: '2021-08-27',
    // },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
}

boasdk.SodiumHelper.assign(new BOASodium());
boasdk.SodiumHelper.init()
    .then(async () => {
        await main(testBusinessProposal);
    })
    .catch((err) => {
        console.log('catch error : ', err);
    })
