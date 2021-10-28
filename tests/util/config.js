require('dotenv').config();

const TEST_VALIDATOR_SEED = process.env.TEST_SEED || 'SCJSYEMS7IEEIVJJWJNBND4O3VYGAHEPDQE3IXKPWICRPTVIKBXQAWXL'; // sample_validators_seed[9] at testServer'ts
const TEST_VALIDATOR_ADDRESS = process.env.TEST_VALIDATOR || 'boa1xzhvenaykmxc8n7ky6e8d6ewake5r045zyl9ty7g6xgd8t988wrzy7gsapw'; // 
const TEST_VALIDATOR_PREIMAGE = process.env.TEST_PREIMAGE || '0xe072724b132279724ae67e64a6642ea32abfab2c1dff3ae7f85a4aa91cd680bb24fe4b6739d1e296ee6d48b61dbc45fe90cb2883bb1d01eb8cd73a10bdcdf083'; // sample_validators_preimage[9]

module.exports = {
    TEST_VALIDATOR_SEED,
    TEST_VALIDATOR_ADDRESS,
    TEST_VALIDATOR_PREIMAGE,
};
