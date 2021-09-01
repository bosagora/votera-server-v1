const axios = require('axios');
const { Keccak } = require('sha3');
const boasdk = require('boa-sdk-ts');
const BOASodium = require('boa-sodium-ts');


const VOTERA_APP = 'Votera';
const TEST_VOTERA_URL = process.env.TEST_VOTERA_URL || 'http://localhost:1337';
const TEST_VOTERA_GRAPHQL = `${TEST_VOTERA_URL}/graphql`;

let jwt;

boasdk.SodiumHelper.assign(new BOASodium.BOASodium());

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

async function loginEx(identifier, password) {
    try {
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
                    password,
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

        return res.data;
    } catch (err) {
        console.log('createProposal error : ', err);
        throw err;
    }
}

async function getProposalById(proposalId) {
    try {
        const res = await sendGraphql(`query getProposalById($proposalId: String!) {
    proposalById(proposalId: $proposalId) {
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
    reportedPosts(proposalId: $proposalId)
}`,
            {
                input: {
                    data: {
                        proposalId
                    }
                }
            });
        return res.data;
    } catch (err) {
        console.log(`getProposalById(${proposalId}) error : `, err);
        throw err;
    }
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
        return res.data;
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
        return res.data;
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

async function createPost_Assess(input) {
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
        return res.data;
    } catch (err) {
        console.log(`createPost error : `, err);
        throw err;
    }
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
        return res.data;
    } catch (err) {
        console.log(`getProposalFee(${id}) error : `, err);
        throw err;
    }
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

module.exports = {
    setJwt,
    generateHashPin,
    dateAddDay,
    loginEx,
    createProposal,
    getProposalById,
    getProposalFee,
    getVoteFee,
    joinProposal,
    createPost_Assess,
    getSummarize,
    makeProposalFeeDataLinkData,
    makeSystemProposalDataLinkData,
    makeFundProposalDataLinkData,
    makeVoteLinkData,
};
