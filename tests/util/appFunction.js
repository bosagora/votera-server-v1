const axios = require('axios');
const { Keccak } = require('sha3');
const boasdk = require('boa-sdk-ts');

const VOTERA_APP = 'Votera';
const TEST_VOTERA_URL = process.env.TEST_VOTERA_URL || 'http://localhost:1337';
const TEST_VOTERA_GRAPHQL = `${TEST_VOTERA_URL}/graphql`;

let jwt;

function setJwt(_jwt) {
    jwt = _jwt;
}

async function sendGraphql(query, variables) {
    try {
        const response = await axios.post(TEST_VOTERA_GRAPHQL, {
            query,
            variables,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${jwt}`
            }
        });
        return response.data;
    } catch (err) {
        if (err.response.data) {
            console.group('sendGraph error');
            console.log('message : ', err.message);
            console.log('config : ', err.config);
            console.log('data.errors : ', err.response.data.errors);
            console.log('stack : ', err.stack);
            console.groupEnd();
        } else {
            console.log('sendGraphql error', err);
        }
        throw err;
    }
}

async function runCronBatch() {
    try {
        const response = await axios.put(`${TEST_VOTERA_URL}/cronjob`, {}, {
            headers: {
                'Authorization': `Bearer ${jwt}`
            }
        });
        return response.data;
    } catch (err) {
        console.log('runCronBatch error : ', err);
        throw err;
    }
}

function generateHashPin(pin, privateKey) {
    const buf = Buffer.from(pin, 'utf8');

    const keccak = new Keccak(256);
    keccak.update(buf);
    const hash1 = keccak.digest();

    const pb = Buffer.from(privateKey.slice(2), 'hex');

    keccak.reset();
    keccak.update(pb);
    keccak.update(hash1);
    let hash2 = keccak.digest();
    for (let i = 1; i < 10; i += 1) {
        keccak.reset();
        keccak.update(hash2);
        hash2 = keccak.digest();
    }

    return hash2.toString('base64');
};

function dateAddDay(value, addDay) {
    const date = new Date(value.getTime());
    if (addDay) {
        date.setDate(date.getDate() + addDay);
    }
    return date;
}

async function loginEx(identifier, password, validator) {
    try {
        const passwd = generateHashPin(password, validator);
        const res = await axios.post(TEST_VOTERA_GRAPHQL, {
            query: `mutation login($input: UsersPermissionsLoginInput!) {
    loginEx(input: $input) {
        jwt
        user {
            id
            username
        }
    }
}`,
            variables: {
                input: {
                    identifier,
                    password : passwd,
                },
            },
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        if (res.data?.data?.loginEx?.jwt) {
            jwt = res.data?.data?.loginEx?.jwt;
        }
        return res.data?.data;
    } catch (err) {
        console.log('getJwt error : ', err);
        throw err;
    }
}

async function getMember() {
    try {
        const res = await sendGraphql(`query MyMembers {
    myMembers {
        id
        username
        members {
            id
            username
            address
        }
    }
}`, {});

        return res.data;
    } catch (err) {
        console.log('getMember error : ', err);
        throw err;
    }
}

async function createProposal(proposal) {
    try {
        const res = await sendGraphql(`mutation CreateProposal($input: createProposalInput) {
    createProposal(input: $input) {
        proposal {
            id
            proposalId
            name
            description
            type
            status
            createdAt
            member_count
            creator {
                id
                username
                address
            }
            activities {
                id
                name
                type
                status
                survey {
                    id
                }
                poll {
                    id
                    questions {
                        id
                    }
                }
            }
            assessPeriod {
                begin
                end
            }
            votePeriod {
                begin
                end
            }
            fundingAmount
            logo {
                url
                mime
            }
            attachment {
                url
                mime
                name
            }
        }
    }
}`,
            {
                input: {
                    data: proposal
                }
            });

        return res.data?.createProposal?.proposal;
    } catch (err) {
        console.log('createProposal error : ', err);
        throw err;
    }
}

async function getProposalById_i(proposalId) {
    try {
        const res = await sendGraphql(`query getProposalById($proposalId: String!) {
    proposalById(proposalId: $proposalId) {
        id
        proposalId
        name
        description
        type
        status
        createdAt
        member_count
        creator {
            id
            username
            address
        }
        activities {
            id
            name
            type
            status
            survey {
                id
            }
            poll {
                id
                questions {
                    id
                }
            }
        }
        assessPeriod {
            begin
            end
        }
        votePeriod {
            begin
            end
        }
        vote_start_height
        vote_end_height
        fundingAmount
        logo {
            url
            mime
        }
        attachment {
            url
            mime
            name
        }
    }
    reportedPosts(proposalId: $proposalId)
}`,
            {
                proposalId
            });
        return res.data;
    } catch (err) {
        console.log(`getProposalById(${proposalId}) error : `, err);
        throw err;
    }
}

async function getProposalById(proposalId) {
    const res = await getProposalById_i(proposalId);
    return res.proposalById;
}

async function getReportedPosts(proposalId) {
    const res = await getProposalById_i(proposalId);
    return res.reportedPosts;
}

async function getProposalFee(id) {
    try {
        const res = await sendGraphql(`query getProposalFee($id: ID!) {
    proposalFee(id: $id) {
        status
        proposer_address
        destination
        amount
    }
}`,
            {
                id
            });
        return res.data?.proposalFee;
    } catch (err) {
        console.log(`getProposalFee(${id}) error : `, err);
        throw err;
    }
}

async function getVoteFee(id) {
    try {
        const res = await sendGraphql(`query getVoteFee($id: ID!) {
    voteFee(id: $id) {
        status
        proposal {
            id
            proposalId
            name
            description
            type
            status
            fundingAmount
            proposer_address
            proposal_fee_address
            proposal_fee
            tx_hash_proposal_fee
            vote_start_height
            vote_end_height
            doc_hash
            vote_fee
            tx_hash_vote_fee
            validators
        }
    }
}`,
            {
                id
            });
        return res.data?.voteFee;
    } catch (err) {
        console.log(`getVoteFee(${id}) error : `, err);
        throw err;
    }
}

async function joinProposal(input) {
    try {
        const res = await sendGraphql(`mutation joinProposal($input: joinProposalInput!) {
    joinProposal(input: $input) {
        invalidVoterCard
        proposal {
            id
        }
    }
}`,
            {
                input: {
                    data: input
                }
            });
        return res.data;
    } catch (err) {
        console.log(`joinProposal error : `, err);
        throw err;
    }
}

async function getActivity(id) {
    try {
        const res = await sendGraphql(`query getActivity($id: ID!) {
    activity(id: $id) {
        id
        name
        type
        status
        survey {
            id
            questions {
                id
                title
                description
                type
                sequence
                content {
                    ... on ComponentActivityScaleOption {
                        id
                        min
                        max
                    }
                    ... on ComponentActivityChoiceOptionList {
                        id
                        item {
                            id
                            sequence
                            text
                        }
                    }
                }
            }
        }
        poll {
            id
            questions {
                id
                title
                description
                type
                sequence
                content {
                    ... on ComponentActivityScaleOption {
                        id
                        min
                        max
                    }
                    ... on ComponentActivityChoiceOptionList {
                        id
                        item {
                            id
                            sequence
                            text
                        }
                    }
                }
            }
        }
    }
}`,
            {
                id
            });
        return res.data?.activity;
    } catch (err) {
        console.log('getActivity error : ', err);
        throw err;
    }
}

async function getAssessActivity(proposal) {
    const proposalAssess = proposal.activities.find((act) => act.type === 'SURVEY');
    return await getActivity(proposalAssess.id);
}

async function getVoteActivity(proposal) {
    const proposalVote = proposal.activities.find((act) => act.type === 'POLL');
    return await getActivity(proposalVote.id);
}

async function getNoticeBoard(proposal) {
    const proposalNotice = proposal.activities.find((act) => act.type === 'BOARD' && act.name.endsWith('_NOTICE'));
    return await getActivity(proposalNotice.id);
}

async function getDiscussionBoard(proposal) {
    const proposalNotice = proposal.activities.find((act) => act.type === 'BOARD' && act.name.endsWith('_DISCUSSION'));
    return await getActivity(proposalNotice.id);
}

async function createPost(input) {
    try {
        const res = await sendGraphql(`mutation CreatePost($input: createPostInput) {
    createPost(input: $input) {
        post {
            id
            type
            status
            writer {
                id
                username
            }
            activity {
                id
                name
                type
                board {
                    id
                }
                proposal {
                    id
                }
            }
            interactions {
                id
                type
                action {
                    ... on ComponentInteractionLike {
                        type
                    }
                    ... on ComponentInteractionRead {
                        count
                    }
                }
                post {
                    id
                }
                actor {
                    id
                    username
                }
            }
            updatedAt
            createdAt
            childPosts {
                id
                type
                status
                updatedAt
                createdAt
                writer {
                    id
                    username
                }
                content {
                    ... on ComponentPostCommentOnPost {
                        id
                        text
                    }
                }
            }
            attachment {
                id
                url
                mime
                name
            }
            content {
                ... on ComponentPostCommentOnActivity {
                    text
                }
                ... on ComponentPostReply {
                    text
                }
                ... on ComponentPostScaleAnswer {
                    key
                    sequence
                    value
                }
                ... on ComponentPostSingleChoiceAnswer {
                    key
                    sequence
                    single: selection {
                        sequence
                        value
                    }
                }
                ... on ComponentPostArticle {
                    id
                    title
                    text
                }
                ... on ComponentPostCommentOnPost {
                    id
                    text
                }
            }
        }
    }
}`,
            {
                input: {
                    data: input
                }
            });
        return res.data?.createPost?.post;
    } catch (err) {
        console.log(`createPost error : `, err);
        throw err;
    }
}

async function createAssessPost(assessActivity, assessResult, memberId) {
    const assessInputData = {
        activity: assessActivity.id,
        type: 'SURVEY_RESPONSE',
        writer: memberId,
        status: 'OPEN',
        content: assessActivity.survey.questions.map((q) => {
            return {
                __typename: 'ComponentPostScaleAnswer',
                value: assessResult[q.sequence].value,
                sequence: assessResult[q.sequence].key,
                question: q.id,
            };
        }),
    };

    return await createPost(assessInputData);
}

async function createVotePost(voteActivity, voteSelect, memberId) {
    const voteInputData = {
        activity: voteActivity.id,
        type: 'POLL_RESPONSE',
        writer: memberId,
        status: 'OPEN',
        content: voteActivity.poll.questions.map((q) => {
            return {
                __typename: 'ComponentPostSingleChoiceAnswer',
                selection: [{ value: 0 }], // do not save vote selection
                sequence: 0,
                question: q?.id,
        }})
    };

    return await createPost(voteInputData);
}

async function createNoticePost(noticeBoard, title, description, attachment, memberId) {
    const noticeInputData = {
        activity: noticeBoard.id,
        type: 'BOARD_ARTICLE',
        attachment,
        status: 'OPEN',
        content: [
            {
                __typename: 'ComponentPostArticle',
                title,
                text: description,
            },
        ],
        writer: memberId,
    };

    return await createPost(noticeInputData);
}

async function createDiscussionPost(discussionBoard, text, memberId) {
    const commentInputData = {
        activity: discussionBoard.id,
        type: 'COMMENT_ON_ACTIVITY',
        status: 'OPEN',
        content: [
            {
                __typename: 'ComponentPostCommentOnActivity',
                text,
            },
        ],
        writer: memberId,
    };

    return await createPost(commentInputData);
}

async function createReplyPost(board, post, text, memberId) {
    const replyInputData = {
        activity: board.id,
        type: 'COMMENT_ON_POST',
        parentPost: post.id,
        status: 'OPEN',
        content: [
            {
                __typename: 'ComponentPostCommentOnPost',
                text,
            },
        ],
        writer: memberId,
    };

    return await createPost(replyInputData);
}

async function updatePost(input) {
    try {
        const res = await sendGraphql(`mutation updatePost($input: updatePostInput) {
    updatePost(input: $input) {
        post {
            id
            type
            status
            writer {
                id
                username
            }
            activity {
                id
                name
                type
                board {
                    id
                }
                proposal {
                    id
                }
            }
            interactions {
                id
                type
                action {
                    ... on ComponentInteractionLike {
                        type
                    }
                    ... on ComponentInteractionRead {
                        count
                    }
                }
                post {
                    id
                }
                actor {
                    id
                    username
                }
            }
            updatedAt
            createdAt
            childPosts {
                id
                type
                status
                updatedAt
                createdAt
                writer {
                    id
                    username
                }
                content {
                    ... on ComponentPostCommentOnPost {
                        id
                        text
                    }
                }
            }
            attachment {
                id
                url
                mime
                name
            }
            content {
                ... on ComponentPostCommentOnActivity {
                    text
                }
                ... on ComponentPostReply {
                    text
                }
                ... on ComponentPostScaleAnswer {
                    key
                    sequence
                    value
                }
                ... on ComponentPostSingleChoiceAnswer {
                    key
                    sequence
                    single: selection {
                        sequence
                        value
                    }
                }
                ... on ComponentPostArticle {
                    id
                    title
                    text
                }
                ... on ComponentPostCommentOnPost {
                    id
                    text
                }
            }
        }
    }
}`,
            {
                input: {
                    data: input
                }
            });
        return res.data?.updatePost.post;
    } catch (err) {
        console.log('updatePost error : ', err);
        throw err;
    }
}

async function getCommentPosts(where, sort, limit, start) {
    try {
        const res = await sendGraphql(`query getCommentPosts($where: JSON, $sort: String, $limit: Int, $start: Int) {
    listPosts(where: $where, sort: $sort, limit: $limit, start: $start) {
        id
        type
        status
        writer {
            id
            username
        }
        activity {
            id
            name
            type
            board {
                id
            }
            proposal {
                id
            }
        }
        interactions {
            id
            type
            action {
                ... on ComponentInteractionLike {
                    type
                }
                ... on ComponentInteractionRead {
                    count
                }
            }
            post {
                id
            }
            actor {
                id
                username
            }
        }
        updatedAt
        createdAt
        childPosts {
            id
            type
            status
            updatedAt
            createdAt
            writer {
                id
                username
            }
            content {
                ... on ComponentPostCommentOnPost {
                    id
                    text
                }
            }
        }
        attachment {
            id
            url
            mime
            name
        }
        content {
            ... on ComponentPostCommentOnActivity {
                text
            }
            ... on ComponentPostReply {
                text
            }
            ... on ComponentPostScaleAnswer {
                key
                sequence
                value
            }
            ... on ComponentPostSingleChoiceAnswer {
                key
                sequence
                single: selection {
                    sequence
                    value
                }
            }
            ... on ComponentPostArticle {
                id
                title
                text
            }
            ... on ComponentPostCommentOnPost {
                id
                text
            }
        }
    }
}`,
            {
                where,
                sort,
                limit,
                start
            });
        return res.data?.listPosts;
    } catch (err) {
        console.log('getCommentPosts error : ', err);
        throw err;
    }
}

async function getDiscussionPosts(activity) {
    const where = {
        activity: activity.id,
        type: 'COMMENT_ON_ACTIVITY',
        status: 'OPEN',
    };
    const sort = 'createdAt:desc';

    return await getCommentPosts(where, sort, 5);
}

async function getNoticePosts(activity) {
    const where = {
        activity: activity.id,
        type: 'BOARD_ARTICLE',
        status: 'OPEN',
    };
    const sort = 'createdAt:desc';

    return await getCommentPosts(where, sort, 5);
}

async function getSummarize(id) {
    try {
        const res = await sendGraphql(`query getSummarize($id: ID) {
    summarize(id: $id) {
        data {
            question {
                id
                title
                description
                type
                sequence
                content {
                    ... on ComponentActivityScaleOption {
                        id
                        min
                        max
                    }
                    ... on ComponentActivityChoiceOptionList {
                        id
                        item {
                            id
                            sequence
                            text
                        }
                    }
                }
            }
            response
        }
    }
}`,
            {
                id
            });
        return res.data?.summarize;
    } catch (err) {
        console.log(`getProposalFee(${id}) error : `, err);
        throw err;
    }
}

async function runToggleLike(post, isLike, memberId) {
    try {
        const res = await sendGraphql(`mutation toggleLike($input: toggleLikeInput) {
    toggleLike(input: $input) {
        isLike
        interaction {
            id
            type
            action {
                ... on ComponentInteractionLike {
                    type
                }
                ... on ComponentInteractionRead {
                    count
                }
            }
            post {
                id
            }
            actor {
                id
                username
            }
        }
    }
}`,
            {
                input: {
                    data: {
                        isLike,
                        postId: post.id,
                        memberId
                    }
                }
            });
        return res.data?.toggleLike;
    } catch (err) {
        console.log('runToggleLike error : ', err);
        throw err;
    }
}

async function reportPost(post, board, proposal, memberId) {
    try {
        const res = await sendGraphql(`mutation reportPost($input: reportPostInput) {
    reportPost(input: $input) {
        interaction {
            id
        }
    }
}`,
            {
                input: {
                    data: {
                        postId: post.id,
                        activityId: board.id,
                        proposalId: proposal.id,
                        actor: memberId,
                    },
                },
            });
        return res.data?.reportPost;
    } catch (err) {
        console.log('reportPost error : ', err);
        throw err;
    }
}

function parseValidatorLogin(qrdata) {
    if (!qrdata.private_key || !qrdata.voter_card) {
        throw new Error('invalid login data');
    }
    const qrvcard = qrdata.voter_card;
    if (!qrvcard.validator || !qrvcard.address || !qrvcard.expires || !qrvcard.signature) {
        throw new Error('invalid login data');
    }

    const private_key = new boasdk.SecretKey(qrdata.private_key);
    const validator = new boasdk.PublicKey(qrvcard.validator);
    const temporary_key = boasdk.KeyPair.fromSeed(private_key);
    const address = temporary_key.address;
    if (address.toString() !== qrvcard.address) {
        throw new Error('VoteCard.address inconsistent');
    }
    const expires = new Date(qrvcard.expires);
    const signature = new boasdk.Signature(qrvcard.signature);
    const voter_card = new boasdk.VoterCard(validator, address, qrvcard.expires, signature);
    if (!voter_card.verify()) {
        throw new Error('VoterCard failed to verify');
    }
    if (Date.now() > expires.getTime()) {
        throw new Error('VoterCard expired');
    }

    return {
        validator: validator.toString(),
        private_key,
        voter_card,
    };
}

function parseValidatorVote(qrdata) {
    if (!qrdata.app || qrdata.app !== VOTERA_APP) {
        throw new Error('unknown App for vote');
    }
    if (!qrdata.height || !qrdata.value || !qrdata.validator || !qrdata.signature) {
        throw new Error('invalid vote data');
    }
    const height = new boasdk.Height(qrdata.height);
    if (boasdk.JSBI.lessThan(height.value, boasdk.JSBI.BigInt(0))) {
        throw new Error('invalid vote data');
    }
    const value = new boasdk.Hash(qrdata.value);
    const validator = new boasdk.PublicKey(qrdata.validator);
    const signature = new boasdk.Signature(qrdata.signature);

    const encryptionKey = new boasdk.EncryptionKey(qrdata.app, height, value, validator, signature);
    if (!encryptionKey.verify()) {
        throw new Error('EncryptionKey failed to verify');
    }

    return {
        validator: validator.toString(),
        encryptionKey,
    };
}

function sdkProposalFeeDataLinkData(proposal_id, proposer, fee_address, fee) {
    const feeData = new boasdk.ProposalFeeData(VOTERA_APP, proposal_id);
    const proposer_address = new boasdk.PublicKey(proposer);
    const destination =  new boasdk.PublicKey(fee_address);
    const amount = boasdk.JSBI.BigInt(fee);

    return feeData.getLinkData(proposer_address, destination, amount);
}

function makeProposalFeeDataLinkData(proposalId, proposalFee) {
    return sdkProposalFeeDataLinkData(
        proposalId || '',
        proposalFee?.proposer_address || '',
        proposalFee?.destination || '',
        proposalFee?.amount || '0',
    );
}

function sdkSystemProposalDataLinkData(proposal, proposer, validators, vote_fee) {
    const voting_fee = boasdk.JSBI.divide(boasdk.JSBI.BigInt(vote_fee), boasdk.JSBI.BigInt(validators.length));
    const proposalData = new boasdk.ProposalData(
        VOTERA_APP,
        boasdk.ProposalType.System,
        proposal.proposal_id,
        proposal.title,
        boasdk.JSBI.BigInt(proposal.start),
        boasdk.JSBI.BigInt(proposal.end),
        new boasdk.Hash(proposal.doc_hash),
        boasdk.JSBI.BigInt(0),
        boasdk.JSBI.BigInt(0),
        boasdk.JSBI.BigInt(vote_fee),
        new boasdk.Hash(Buffer.alloc(boasdk.Hash.Width)),
        new boasdk.PublicKey(proposer),
        new boasdk.PublicKey(proposer),
    );

    return proposalData.getLinkData(new boasdk.PublicKey(proposer), validators.map((validator) => new boasdk.PublicKey(validator)), voting_fee);
}

function makeSystemProposalDataLinkData(proposal) {
    return sdkSystemProposalDataLinkData(
        {
            proposal_id: proposal.proposalId || '',
            title: proposal.name || '',
            start: proposal.vote_start_height || 0,
            end: proposal.vote_end_height || 0,
            doc_hash: proposal.doc_hash || '',
        },
        proposal.proposer_address || '',
        JSON.parse(proposal.validators || '[]'),
        proposal.vote_fee || '0',
    );
}

function sdkFundProposalDataLinkData(proposal, proposer, fee_address, validators, vote_fee) {
    const voting_fee = boasdk.JSBI.divide(boasdk.JSBI.BigInt(vote_fee), boasdk.JSBI.BigInt(validators.length));
    const proposalData = new boasdk.ProposalData(
        VOTERA_APP,
        boasdk.ProposalType.Fund,
        proposal.proposal_id,
        proposal.title,
        boasdk.JSBI.BigInt(proposal.start),
        boasdk.JSBI.BigInt(proposal.end),
        new boasdk.Hash(proposal.doc_hash),
        boasdk.JSBI.BigInt(proposal.fund_amount),
        boasdk.JSBI.BigInt(proposal.proposal_fee),
        boasdk.JSBI.BigInt(vote_fee),
        new boasdk.Hash(proposal.tx_hash_proposal_fee),
        new boasdk.PublicKey(proposer),
        new boasdk.PublicKey(fee_address),
    );

    return proposalData.getLinkData(new boasdk.PublicKey(proposer), validators.map((validator) => new boasdk.PublicKey(validator)), voting_fee);
}

function makeFundProposalDataLinkData(proposal) {
    return sdkFundProposalDataLinkData(
        {
            proposal_id: proposal.proposalId || '',
            title: proposal.name || '',
            start: proposal.vote_start_height || 0,
            end: proposal.vote_end_height || 0,
            doc_hash: proposal.doc_hash || '',
            fund_amount: proposal.fundingAmount || '0',
            proposal_fee: proposal.proposal_fee || '0',
            tx_hash_proposal_fee: proposal.tx_hash_proposal_fee || '',
        },
        proposal.proposer_address || '',
        proposal.proposal_fee_address || '',
        JSON.parse(proposal.validators || '[]'),
        proposal.vote_fee || '0',
    )
}

function makeVoteLinkData(proposal_id, validator_login, validator_vote, vote, sequence) {
    let ballotSelect = (vote === 'YES') ? Buffer.from([boasdk.BallotData.YES]) : (vote === 'NO') ? Buffer.from([boasdk.BallotData.NO]) : Buffer.from([boasdk.BallotData.BLANK]);

    const key_encrypt = boasdk.Encrypt.createKey(validator_vote.encryptionKey.value.data, proposal_id);
    const ballot = boasdk.Encrypt.encrypt(ballotSelect, key_encrypt);
    const ballot_data = new boasdk.BallotData(VOTERA_APP, proposal_id, ballot, validator_login.voter_card, sequence);
    ballot_data.signature = validator_login.private_key.sign(ballot_data);

    return ballot_data.getLinkData();
}

function encryptionBlockHeight(proposal) {
    return (proposal?.vote_end_height || 0) + 7;
}

function getVoteSequence() {
    return Math.floor(Date.now() / 1000);
}

module.exports = {
    setJwt,
    generateHashPin,
    dateAddDay,
    loginEx,
    getMember,
    createProposal,
    getProposalById,
    getProposalFee,
    getVoteFee,
    joinProposal,
    getActivity,
    getAssessActivity,
    getVoteActivity,
    getNoticeBoard,
    getDiscussionBoard,
    getReportedPosts,
    createPost,
    createAssessPost,
    createVotePost,
    createNoticePost,
    createDiscussionPost,
    createReplyPost,
    updatePost,
    getCommentPosts,
    getDiscussionPosts,
    getNoticePosts,
    getSummarize,
    runToggleLike,
    reportPost,
    parseValidatorLogin,
    parseValidatorVote,
    makeProposalFeeDataLinkData,
    makeSystemProposalDataLinkData,
    makeFundProposalDataLinkData,
    makeVoteLinkData,
    encryptionBlockHeight,
    getVoteSequence,
    runCronBatch,
};
