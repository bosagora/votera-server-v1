require('dotenv').config();
const moment = require('moment');

const fn = require('./appFunction');

const TEST_IDENTIFIER = process.env.TEST_IDENTIFIER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const TEST_MEMBERID = process.env.TEST_MEMBERID;
const TEST_VALIDATOR = process.env.TEST_VALIDATOR;

const systemProposal = {
    name: 'SystemTest1',
    description: 'Test1Description',
    type: 'SYSTEM',
    status: 'PENDING_VOTE',
    fundingAmount: '10000000',
    votePeriod: {
        begin: moment().add(1, 'day').format('YYYY-MM-DD'),
        end: moment().add(2, 'day').format('YYYY-MM-DD'),
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
};

async function main() {
    try {
        const passwd = fn.generateHashPin(TEST_PASSWORD, TEST_VALIDATOR);
        await fn.loginEx(TEST_IDENTIFIER, passwd);

        const res = await fn.createProposal({...systemProposal, creator: TEST_MEMBERID});
        if (!res.createProposal) {
            console.log('createProposal result = ', res);
            return;
        }

        const proposal = res.createProposal.proposal;
        console.log('proposal = ', proposal);

        const voteFeeRes = await fn.getVoteFee(proposal.id);
        console.log('voteFee result = ', voteFeeRes);

        const voteFeeRes = await fn.getVoteFee(proposal.id);
        console.log('voteFee result = ')

    } catch (err) {
        console.log('catch error', err);
    }
}

main().catch((err) => {
    console.log('main catch error', err);
});
