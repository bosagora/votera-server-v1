require('dotenv').config();

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
        begin: '2021-08-25',
        end: '2021-08-26',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
};

const businessProposal = {
    name: 'BusinessTest1',
    description: 'Business1Description',
    type: 'BUSINESS',
    status: 'PENDING_ASSESS',
    fundingAmount: '100000000',
    assessPeriod: {
        begin: '2021-08-25',
        end: '2021-08-26'
    },
    votePeriod: {
        begin: '2021-08-26',
        end: '2021-08-27',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
}

async function main() {
    try {
        const passwd = fn.generateHashPin(TEST_PASSWORD, TEST_VALIDATOR);
        await fn.loginEx(TEST_IDENTIFIER, passwd);

        const res1 = await fn.createProposal({...systemProposal, creator: TEST_MEMBERID});
        console.log('createProposal data = ', res1);

        const res2 = await fn.createProposal({...businessProposal, creator: TEST_MEMBERID});
        console.log('createProposal data = ', res2);

    } catch (err) {
        console.log('catch error', err);
    }
}

main().catch((err) => {
    console.log('main catch error', err);
});
