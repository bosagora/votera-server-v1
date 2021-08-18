require('dotenv').config();

const TEST_VOTERA_URL = process.env.TEST_VOTERA_URL || 'http://localhost:1337';
const TEST_IDENTIFIER = process.env.TEST_IDENTIFIER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const proposals = [ {
    name: 'Test1',
    description: 'Test1Description',
    type: 'SYSTEM',
    status: 'PENDING_VOTE',
    fundingAmount: '10000000',
    votePeriod: {
        begin: '2021-08-18',
        end: '2021-08-19',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
}, {
    name: 'Test2',
    description: 'Test2Description',
    type: 'SYSTEM',
    status: 'VOTE',
    fundingAmount: '10000000',
    votePeriod: {
        begin: '2021-08-18',
        end: '2021-08-19',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    vote_fee: '10000',
    tx_hash_vote_fee: 'vote_fee_tx_hash',
    validators: '["boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e"]',
}, {
    name: 'Test3',
    description: 'Test3Description',
    type: 'SYSTEM',
    status: 'CLOSED',
    fundingAmount: '10000000',
    votePeriod: {
        begin: '2021-08-18',
        end: '2021-08-19',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    vote_fee: '10000',
    tx_hash_vote_fee: 'vote_fee_tx_hash',
    validators: '["boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e"]',
}, {
    name: 'Business1',
    description: 'Business1Description',
    type: 'BUSINESS',
    status: 'PENDING_ASSESS',
    fundingAmount: '100000000',
    assessPeriod: {
        begin: '2021-08-18',
        end: '2021-08-19'
    },
    votePeriod: {
        begin: '2021-08-19',
        end: '2021-08-20',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    proposal_fee_address: 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s',
}, {
    name: 'Business2',
    description: 'Business2Description',
    type: 'BUSINESS',
    status: 'ASSESS',
    fundingAmount: '100000000',
    assessPeriod: {
        begin: '2021-08-18',
        end: '2021-08-19'
    },
    votePeriod: {
        begin: '2021-08-19',
        end: '2021-08-20',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    proposal_fee_address: 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s',
    tx_hash_proposal_fee: 'tx_hash_proposal_fee',
}, {
    name: 'Business3',
    description: 'Business3Description',
    type: 'BUSINESS',
    status: 'PENDING_VOTE',
    fundingAmount: '100000000',
    assessPeriod: {
        begin: '2021-08-18',
        end: '2021-08-19'
    },
    votePeriod: {
        begin: '2021-08-19',
        end: '2021-08-20',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    proposal_fee_address: 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s',
    tx_hash_proposal_fee: 'tx_hash_proposal_fee',
}, {
    name: 'Business4',
    description: 'Business4Description',
    type: 'BUSINESS',
    status: 'VOTE',
    fundingAmount: '100000000',
    assessPeriod: {
        begin: '2021-08-18',
        end: '2021-08-19'
    },
    votePeriod: {
        begin: '2021-08-19',
        end: '2021-08-20',
    },
    proposer_address: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
    proposal_fee_address: 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s',
    tx_hash_proposal_fee: 'tx_hash_proposal_fee',
    vote_fee: '10000',
    tx_hash_vote_fee: 'vote_fee_tx_hash',
    validators: '["boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e"]'
}];

const axios = require('axios');
async function main() {
    try {
        const jwt_res = await axios.post(`${TEST_VOTERA_URL}/auth/local`, {
            identifier: TEST_IDENTIFIER,
            password: TEST_PASSWORD,
        });
        const config = {
            headers: {
                'Authorization': `Bearer ${jwt_res.data.jwt}`,
            },
        };

        for (const proposal of proposals) {
            try {
                const res = await axios.post(`${TEST_VOTERA_URL}/proposals/test`, proposal, config);
                if (res.status !== 200) {
                    console.log(`FAILED_createProposal ${proposal.name} by : `, res.statusText);
                    console.log('response body : ', res.data);
                } else if (!res.data?.id) {
                    console.log(`FAILED_createProposal ${proposal.name} : NO_ID`);
                    console.log('response body : ', res.data);
                } else {
                    console.log(`okay ${proposal.name} : ${res.data.id}`);
                }
            } catch (err) {
                console.log(`FAILED_createProposal ${proposal.name} by : `, err);
            }
        }
    } catch (err) {
        console.log('catch error', err);
    }
}

main().catch((err) => {
    console.log('main catch error', err);
});
