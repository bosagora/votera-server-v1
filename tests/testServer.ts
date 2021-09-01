import * as boasdk from 'boa-sdk-ts';
import { BOASodium } from 'boa-sodium-ts';
import express from 'express';
import * as http from 'http';
import JSBI from 'jsbi';
import { SmartBuffer } from 'smart-buffer';
import bodyParser from 'body-parser';
import QRCode from 'qrcode-svg';
import axios from 'axios';

const default_app_name = 'Votera';
const default_voting_fee = 29310000;
const test_app_root = '/voteratest';
// const test_app_root = '';

let sample_validators_seed = [
    'SCC6Y63FQMXDPIF3JHCFOZ2FJQ7IDXX3M3BI4SY7JNIK4TWNT37QMGG4',
    'SDJAZ6N24TA7725QRXKZA65XYAIFYYWXQ76RYXCNJ4WLJ7765GLQ6K6E',
    'SCV2FQUZNANQM7JTCHWAXRRIFWRZTIA6QNCQL5BEVPWZAB55PBTATT5Z',
    'SCGIJI772JYZTIGFT7EF7V4ELMH3XIBY2SMP6C4ISUVLBCKGTKDQRMP5',
    'SCSPZ3AOA2V4LD3WCOHJTVXLHFXICJQIEUCEDC4BWWWPRUAVDZBAMXCA',
    'SACI4ENTRYFDEUPHAHT6R7QMIYLUCTSLNLY6WENLTEUII26ALSUA3LAF',
    'SCRCZBXE3KVJJRJPKD2BV3E7DNI2PMYUSWOJUDE6TTI4QMXUVDSQR74S',
    'SAXJ3XPTAIG7VVXP6JANVDFUNBMPD35SL5RYA6SBJ4QXKYLNGK2Q4XY5',
    'SADJP2YGOHI57HD53MC5ZQEWHGJEMTVD3MSYCUCLJNM2DBQ2P5FAQ2VY',
    'SCJSYEMS7IEEIVJJWJNBND4O3VYGAHEPDQE3IXKPWICRPTVIKBXQAWXL',
];

let sample_validators_preimage = [
    '0x320deb6b16b71015065701521254525e593009688846ff087d1afdf20d795876776c25c50207a50a1897571285fb9e97d88943d6bc51069fd9ba529a1ae68b83',
    '0xf5b294bb2e6d5d686018a1141469877e6c34cc6f4fc852f5c4ae5fe5d592c41fae56908d16686e0e0040e73b861c13196a910398b5e8fc8115f14294d992d1da',
    '0xe76bc55d425515a74ee7eb39662e0344de23dfc202653b567b9a8b35a6cbb889838b19239e6154adadbc642697e097d5d5ade0b19e0af17a1069721dc762c6af',
    '0x5fe7e4607378b47df1116021507f377820f208a60f05a69ed157a1c829e49502cbc52e914f2a3f0675a97310af1d59548c0e4232ec8194b74bd5ff2de7126ecc',
    '0x4e0928d9608b881adab2601f11e136d4ef6562be94798c91281985b83c7d8f656b5386893af23d96a33ec65a6fd22a7cb0fdd390b0c32866835c9006ce76d010',
    '0x146cf964d717bd2c17d915bf1ea4d05a9aa9524d9bf4e9cc99936e753a51038e1c1d4d7865e8dd3eb5a00d5ac4509b2b3e78e17223f038493b7d161f0de99630',
    '0xde4d1ba57daebe969ff613be0b1cc92e1c1450477be4491772243a0753cc8689faa3044ef52760c2239fdfdc22e2e4e096a674bdcc4f3a4c836cdf2b6b7c2dad',
    '0xb921e88dbb8ce296db19495a7ae217331b97b8ecdcbbaac2f938d494d9c84012a363a0ebe731fd250946b6da6e52402fadd9418ee0ee38d849a93c0a8350fbb1',
    '0x48a3fe570d2d56f53426a5195e0148d196daa84c05b010d8ac725dec6dc0320b1dc037f82d1b274dde2b0ce5638cf742bc181e5779b73209e87951204425378b',
    '0xe072724b132279724ae67e64a6642ea32abfab2c1dff3ae7f85a4aa91cd680bb24fe4b6739d1e296ee6d48b61dbc45fe90cb2883bb1d01eb8cd73a10bdcdf083',
];

const maxHeight = 100;
const map_sample_tx = new Map<string, boasdk.Transaction>();
const list_tx_history: boasdk.ITxHistoryElement[] = [];

let jwt: string;

const milliseconds_per_block = 600000;
// const milliseconds_per_block = 10000;   // per 10 sec

function getBlockHeightAt(when: Date) {
    const baseDate = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));
    if (when.getTime() < baseDate.getTime()) {
        return 0;
    }
    
    const height = Math.floor((when.getTime() - baseDate.getTime()) / milliseconds_per_block);
    return height;
}

function getWhenAtBlock(height: number) {
    const baseDate = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));
    const time_stamp = Math.floor((baseDate.getTime() + height * milliseconds_per_block) / 1000);
    return {
        height,
        time_stamp
    };
}

async function getProposal(proposal_id: string) {
    try {
        if (!jwt) {
            const authResponse = await axios.post('http://localhost:1337/auth/local', {
                identifier: 'votera@abowa.io',
                password: '123456',
            });
            if (authResponse?.data?.jwt) {
                jwt = authResponse.data.jwt;
            }
        }
        if (!jwt) {
            console.log('failed to get jwt');
            return null;
        }

        const proposalResponse = await axios.get('http://localhost:1337/proposals/byid/' + proposal_id, {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        });
        if (proposalResponse.data) {
            return proposalResponse.data;
        } else {
            return null;
        }
    } catch (err) {
        console.log('failed to get proposal. err = ', err.message);
        return null;
    }
}

function getPreimageAt(basis_preimage: string, height: number) {
    if (height < 0) {
        throw new Error('invalid parameter');
    }

    const hashCount = height % maxHeight;
    if (hashCount === 0) {
        return basis_preimage;
    }

    let temp_hash = new boasdk.Hash(basis_preimage);
    for (let idx = 0; idx < hashCount; idx += 1) {
        temp_hash = boasdk.hash(temp_hash.data);
    }

    return temp_hash.toString();
}

// sampleValidator 추가 3 ~ 9
function addSampleValidator() {
    for (let i = 3; i < 10; i += 1) {
        const validator_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey(sample_validators_seed[i]));
        const validator = {
            address: validator_key.address.toString(),
            enrolled_at: 0,
            stake: boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))).toString(),
            preimage: {
                height: 1,
                hash: getPreimageAt(sample_validators_preimage[i], 1),
            },
        };

        sample_validators.push(validator);
    }
}

function makeNewValidator() {
    const validator_key = boasdk.KeyPair.random();
    const validator_seed = validator_key.secret.toString(false);
    const preimage = boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width)));

    const validator = {
        address: validator_key.address.toString(),
        enrolled_at: 0,
        stake: boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))).toString(),
        preimage: {
            height: 1,
            hash: getPreimageAt(preimage.toString(), 1),
        },
    };

    sample_validators_seed.push(validator_seed);
    sample_validators_preimage.push(preimage.toString());
    sample_validators.push(validator);

    return {
        validator_seed,
        preimage,
    };
}

function makeProposalFeeTransaction(
    address: string,
    destination: string,
    feeAmount: number,
    data: boasdk.ProposalFeeData,
) {
    const fee_bytes = new SmartBuffer();
    data.serialize(fee_bytes);

    const tx_hash = boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))).toString();

    // make transaction
    const tx = new boasdk.Transaction(
        [new boasdk.TxInput(boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))))],
        [new boasdk.TxOutput(boasdk.OutputType.Payment, JSBI.BigInt(feeAmount), boasdk.Lock.fromPublicKey(new boasdk.PublicKey(destination)))],
        fee_bytes.toBuffer(),
    );

    map_sample_tx.set(tx_hash, tx);

    const now = new Date();
    const unlock = new Date(now.getTime() + 600 * 1000);

    const tx_history: boasdk.ITxHistoryElement = {
        display_tx_type: 'payload',
        address,
        peer: address,
        peer_count: 1,
        height: getBlockHeightAt(now).toString(),
        time: Math.floor(now.getTime() / 1000),
        tx_hash,
        tx_type: 'payment',
        amount: (-1 * feeAmount).toString(),
        unlock_height: getBlockHeightAt(unlock).toString(),
        unlock_time: Math.floor(unlock.getTime() / 1000),
    };

    list_tx_history.push(tx_history);
}

function makeProposalDataTransaction(
    address: string,
    validators: string[],
    voting_fee: number,
    data: boasdk.ProposalData,
) {
    const data_bytes = new SmartBuffer();
    data.serialize(data_bytes);

    const tx_hash = boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))).toString();

    // make transaction
    const tx = new boasdk.Transaction(
        [new boasdk.TxInput(boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))))],
        validators.map(
            (validator) =>
                new boasdk.TxOutput(
                    boasdk.OutputType.Payment,
                    JSBI.BigInt(voting_fee),
                    boasdk.Lock.fromPublicKey(new boasdk.PublicKey(validator)),
                ),
        ),
        data_bytes.toBuffer(),
    );

    map_sample_tx.set(tx_hash, tx);

    const now = new Date();
    const unlock = new Date(now.getTime() + 600 * 1000);

    const tx_history: boasdk.ITxHistoryElement = {
        display_tx_type: 'payload',
        address,
        peer: address,
        peer_count: validators.length,
        height: getBlockHeightAt(now).toString(),
        time: Math.floor(now.getTime() / 1000),
        tx_hash,
        tx_type: 'payment',
        amount: (voting_fee * validators.length * -1).toString(),
        unlock_height: getBlockHeightAt(unlock).toString(),
        unlock_time: Math.floor(unlock.getTime() / 1000),
    };

    list_tx_history.push(tx_history);
}

function makeBallotDataTransaction(address: string, vote_fee: number, data: boasdk.BallotData) {
    const ballot_bytes = new SmartBuffer();
    data.serialize(ballot_bytes);

    const tx_hash = boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))).toString();

    // make transaction
    const tx = new boasdk.Transaction(
        [new boasdk.TxInput(boasdk.hash(Buffer.from(boasdk.SodiumHelper.sodium.randombytes_buf(boasdk.Hash.Width))))],
        [new boasdk.TxOutput(boasdk.OutputType.Payment, JSBI.BigInt(vote_fee), boasdk.Lock.fromPublicKey(new boasdk.PublicKey(address)))],
        ballot_bytes.toBuffer(),
    );

    map_sample_tx.set(tx_hash, tx);

    const now = new Date();
    const unlock = new Date(now.getTime() + 600 * 1000);

    const tx_history: boasdk.ITxHistoryElement = {
        display_tx_type: 'payload',
        address,
        peer: address,
        peer_count: 1,
        height: getBlockHeightAt(now).toString(),
        time: Math.floor(now.getTime() / 1000),
        tx_hash,
        tx_type: 'payment',
        amount: (-1 * vote_fee).toString(),
        unlock_height: getBlockHeightAt(unlock).toString(),
        unlock_time: Math.floor(unlock.getTime() / 1000),
    };

    list_tx_history.push(tx_history);
}

/**
 * sample JSON
 */
let sample_validators = [
    {
        address: 'boa1xpk68tw7chwwmmx7vgnc3wfm0fm9368jnvr7dpcqvxwmc2xk8u5s5ugm0g6',
        enrolled_at: 0,
        stake:
            '0x210b66053c73e7bd7b27673706f0272617d09b8cda76605e91ab66ad1cc3bfc1f3f5fede91fd74bb2d2073de587c6ee495cfb0d981f03a83651b48ce0e576a1a',
        preimage: {
            height: 1,
            hash:
                '0x70f8a9eb2b4fa95a56a7a2eb85fa522f15c78a24188ef5207240ab040aada81a418c8444dd023991bec68bf3069f0e3f989edf7879864ced23973de2bed93923',
        },
    },
    {
        address: 'boa1xrtxfre72g5f5hh55vdd85cmg8mvhzf4jwzlup4au3fmqrlxl920c7xv0mc',
        enrolled_at: 0,
        stake:
            '0x86f1a6dff3b1f2256d2417b71ecc5511293b224894da5fd75c192965aa1874824ca777ecac678c871e717ad38c295046f4f64130f31750aa967c30c35529944a',
        preimage: {
            height: 1,
            hash:
                '0x34ebf9ad11b5f8873641c2c66a79719ccc578ea587ecdd6c43669541c460b4f8e62ac9d911209e0d2876e12c97d0cc7c49c978bbc651c038118f08552394225c',
        },
    },
    {
        address: 'boa1xpqe7va0rx40rmyef3gt9u56purlfwtrjkc5jf0fsfqzpvpx7sy0vhkg5qq',
        enrolled_at: 0,
        stake:
            '0xf21f606e96d6130b02a807655fda22c8888111f2045c0d45eda9c26d3c97741ca32fc68960ae68220809843d92671083e32395a848203380e5dfd46e4b0261f0',
        preimage: {
            height: 1,
            hash:
                '0xfa0869185ee84c4ffc283a0ccd7edfb5e009ee722f0fa7734d5e41b5ad811ebacf89c346aa3efeb9458029d974695f3b5c0759f6e38cba84a82b716757176450',
        },
    },
];

/**
 * Sample UTXOs
 */
let sample_utxo_address = 'boa1xrq66nug6wnen9sp5cm7xhfw03yea8e9x63ggay3v5dhe6d9jerqz50eld0';
let sample_utxo = [
    {
        utxo:
            '0x6d85d61fd9d7bb663349ca028bd023ad1bd8fa65c68b4b1363a9c7406b4d663fd73fd386195ba2389100b5cd5fc06b440f053fe513f739844e2d72df302e8ad0',
        type: 1,
        height: '0',
        time: 1577836800000,
        unlock_height: '1',
        amount: '200000',
    },
    {
        utxo:
            '0x3451d94322524e3923fd26f0597fb8a9cdbf3a9427c38ed1ca61104796d39c5b9b5ea33d576f17c2dc17bebc5d84a0559de8c8c521dfe725d4c352255fc71e85',
        type: 0,
        height: '1',
        time: 1577837400000,
        unlock_height: '2',
        amount: '200000',
    },
    {
        utxo:
            '0xfca92fe76629311c6208a49e89cb26f5260777278cd8b272e7bb3021adf429957fd6844eb3b8ff64a1f6074126163fd636877fa92a1f4329c5116873161fbaf8',
        type: 0,
        height: '2',
        time: 1577838000000,
        unlock_height: '3',
        amount: '200000',
    },
    {
        utxo:
            '0x7e1958dbe6839d8520d65013bbc85d36d47a9f64cf608cc66c0d816f0b45f5c8a85a8990725ffbb1ab13c3c65b45fdc06f4745d455e00e1068c4c5c0b661d685',
        type: 0,
        height: '3',
        time: 1577838600000,
        unlock_height: '4',
        amount: '200000',
    },
    {
        utxo:
            '0xd44608de8a5015b04f933098fd7f67f84ffbf00c678836d38c661ab6dc1f149606bdc96bad149375e16dc5722b077b14c0a4afdbe6d30932f783650f435bcb92',
        type: 0,
        height: '4',
        time: 1577839200000,
        unlock_height: '5',
        unlock_time: 1577836800000,
        amount: '200000',
    },
    {
        utxo:
            '0xc3780f9907a97c20a2955945544e7732a60702c32d81e016bdf1ea172b7b7fb96e9a4164176663a146615307aaadfbbad77e615a7c792a89191e85471120d314',
        type: 0,
        height: '5',
        time: 1577839800000,
        unlock_height: '6',
        amount: '200000',
    },
    {
        utxo:
            '0x451a5b7929615121e0f2be759222853ea3acb45c94430a03de29a47db7c70e04eb4fce5b4a0c5af01d98331732546fede05fdfaf6ab429b3960aad6a20bbf0eb',
        type: 0,
        height: '6',
        time: 1577840400000,
        unlock_height: '7',
        amount: '200000',
    },
    {
        utxo:
            '0xff05579da497ac482ccd2be1851e9ff1196314e97228a1fca62e6292b5e7ea91cadca41d6afe2d57048bf594c6dd73ab1f93e96717c73c128807905e7175beeb',
        type: 0,
        height: '7',
        time: 1577841000000,
        unlock_height: '8',
        unlock_time: 1577836800000,
        amount: '200000',
    },
    {
        utxo:
            '0xcfa89b7a9cd48fddc16cdcbbf0ffa7a9fd14d89c96bc3da0151db0bd7e453fe031f8a1e4d575a299c16942d9c96fbafff2497332bc48532aa7e0acf6122be0e2',
        type: 0,
        height: '8',
        time: 1577841600000,
        unlock_height: '9',
        amount: '200000',
    },
    {
        utxo:
            '0x37e17420b4bfd8be693475fbbe8b53bb80904dd3e45f3080c0d0b912b004324a27693559d884b943830f6a21b05c69061f453e8b9f03d56f3b6fd5b0c6fc2f8b',
        type: 0,
        height: '9',
        time: 1577842200000,
        unlock_height: '10',
        amount: '100000',
    },
];

let sample_tx = {
    type: 0,
    inputs: [
        {
            utxo:
                '0xc0abcbff07879bfdb1495b8fdb9a9e5d2b07a689c7b9b3c583459082259be35687c125a1ddd6bd28b4fe8533ff794d3dba466b5f91117bbf557c3f1b6ff50e5f',
            unlock: {
                bytes: 'o78xIUchVl3X7B/KzFtDnt1K72bVeiAK4iy1ZK4+T5m0Fw3KCxf2YBdgLJ3jANQsH5eU7+YbABxCO1ayJaAGBw==',
            },
            unlock_age: 0,
        },
    ],
    outputs: [
        {
            value: '4000000000000',
            lock: {
                type: 0,
                bytes: '2uGT6ekor8/HWR2ijoG2SXrc6XfFwBe1yBWSNNDlo7Q=',
            },
        },
        {
            value: '4000000000000',
            lock: {
                type: 0,
                bytes: '2uGT6ekor8/HWR2ijoG2SXrc6XfFwBe1yBWSNNDlo7Q=',
            },
        },
        {
            value: '4000000000000',
            lock: {
                type: 0,
                bytes: '2uGT6ekor8/HWR2ijoG2SXrc6XfFwBe1yBWSNNDlo7Q=',
            },
        },
        {
            value: '4000000000000',
            lock: {
                type: 0,
                bytes: '2uGT6ekor8/HWR2ijoG2SXrc6XfFwBe1yBWSNNDlo7Q=',
            },
        },
        {
            value: '4000000000000',
            lock: {
                type: 0,
                bytes: '2uGT6ekor8/HWR2ijoG2SXrc6XfFwBe1yBWSNNDlo7Q=',
            },
        },
    ],
    payload: '',
    lock_height: '0',
};

let sample_txs_history = [
    {
        display_tx_type: 'inbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '9',
        time: 1601553600,
        tx_hash:
            '0xf3a013153900f6416af03efc855df3880e3927fff386b3635bf46cd6e2c54769f88bd24128b6b935ab95af803cc41412fe9079b4ed7684538d86840115838814',
        tx_type: 'payment',
        amount: '610000000000000',
        unlock_height: '10',
        unlock_time: 1601554200,
    },
    {
        display_tx_type: 'outbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '8',
        time: 1600953600,
        tx_hash:
            '0x63341a4502434e2c89d0f4e46cb9cbd27dfa8a6d244685bb5eb6635d634b2179b49108e949f176906a13b8685254b1098ebf1adf44033f5c9dd6b4362c14b020',
        tx_type: 'payment',
        amount: '-610000000000000',
        unlock_height: '9',
        unlock_time: 1600954200,
    },
    {
        display_tx_type: 'inbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '7',
        time: 1600353600,
        tx_hash:
            '0xcf3ca7b3d5c8f6bac821a7812318eb2ab89a6b9345c5e8dbf41d5e69067c3e38642cf8679187d9c0a5ae11477f0e9d632ed950fb25baf4bcfd9b397a4a611d01',
        tx_type: 'payment',
        amount: '610000000000000',
        unlock_height: '8',
        unlock_time: 1600354200,
    },
    {
        display_tx_type: 'outbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '6',
        time: 1599753600,
        tx_hash:
            '0xb14c45657f4fd6ff7dc0a64c08c29304704c4c0c54096a8d3cdcff9a33d31ccfe64b3fe5d26527e90d53519189497b1c602b84db659f90d58f9d8ec10088f572',
        tx_type: 'payment',
        amount: '-610000000000000',
        unlock_height: '7',
        unlock_time: 1599754200,
    },
    {
        display_tx_type: 'inbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '5',
        time: 1599153600,
        tx_hash:
            '0x22152566c7d705f419752bb7907984f8071ecce51368774b42980b150cd967a72ca38bc4d3b2c6d94989458f17fcf365820f656d9bbdf2091f13c24947509fe2',
        tx_type: 'payment',
        amount: '610000000000000',
        unlock_height: '6',
        unlock_time: 1599154200,
    },
    {
        display_tx_type: 'outbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '4',
        time: 1598553600,
        tx_hash:
            '0x85f160d6018473ee4e38dbcb784d7e7e69ae8db77d8ab6de27e373feeb6d0e6e35d1d4952063e7a0efec3a2a7aad8b72399fecc0655b1920cfb6fc9403e5c72a',
        tx_type: 'payment',
        amount: '-610000000000000',
        unlock_height: '5',
        unlock_time: 1598554200,
    },
    {
        display_tx_type: 'inbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '3',
        time: 1597953600,
        tx_hash:
            '0x148891ad8dfaa13276434bfbc9525111dea803de185afe4dd12e5564b23163399e9f37bfdba4e9041ea189377f184cc25533e3361479e2e0c8dc461abe86bbfa',
        tx_type: 'payment',
        amount: '610000000000000',
        unlock_height: '4',
        unlock_time: 1597954200,
    },
    {
        display_tx_type: 'outbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'boa1xrw66w303s5x05ej9uu6djc54kue29j72kah22xqqcrtqj57ztwm5uh524e',
        peer_count: 1,
        height: '2',
        time: 1597353600,
        tx_hash:
            '0x2ff28f6f890be85fe2d23ff0e42bd7e5c8626cb7749e00978dd7296b28583effdb038db5a1922b06eddb5c7b23bc67e9db8d3ce3ee9b701854ab05a8cc313caa',
        tx_type: 'payment',
        amount: '-610000000000000',
        unlock_height: '3',
        unlock_time: 1597354200,
    },
    {
        display_tx_type: 'inbound',
        address: 'boa1xrx66ezhd6uzx2s0plpgtwwmwmv4tfzvgp5sswqcg8z6m79s05pactt2yc9',
        peer: 'GDAZW22V4WVQ6Y6ILIKY3BNODEWBXXK5VY2B3HACFM6VWV4JEEAPDHCC',
        peer_count: 1,
        height: '1',
        time: 1596753600,
        tx_hash:
            '0x520d6766f3142d391d80ac1a47d63d7978476415030f9ff61eea2374dda1b85e7f699364d7f8db8993dd078de6f95f525c5e2d66cd20fea2ed34c340b44db9f3',
        tx_type: 'payment',
        amount: '610000000000000',
        unlock_height: '2',
        unlock_time: 1596754200,
    },
];

let sample_tx_overview = {
    height: '9',
    time: 1601553600,
    tx_hash:
        '0xc2fed6fe6e445328bf363bb2725c23593b5ac43f0e0cd456f22bab77ef7b81a2661b9a07308a909047acf2b886522a50d7dd9195072de2272509963aeec34e52',
    tx_type: 'payment',
    unlock_height: '10',
    unlock_time: 1601554200,
    payload: '',
    senders: [
        {
            address: 'boa1xrgq6607dulyra5r9dw0ha6883va0jghdzk67er49h3ysm7k222ruhh7400',
            amount: 610000000000000,
            utxo:
                '0xb0383981111438cf154c7725293009d53462c66d641f76506400f64f55f9cb2e253dafb37af9fafd8b0031e6b9789f96a3a4be06b3a15fa592828ec7f8c489cc',
        },
    ],
    receivers: [
        {
            address: 'boa1xrq66nug6wnen9sp5cm7xhfw03yea8e9x63ggay3v5dhe6d9jerqz50eld0',
            amount: 610000000000000,
            utxo:
                '0xefed6c1701d1195524d469a3bbb058492a7922ff98e7284a01f14c0a32c31814f4ed0d6666aaf7071ae0f1eb615920173f13a63c8774aa5955a3af77c51e55e9',
        },
    ],
    fee: '0',
};

let sample_txs_pending = [
    {
        tx_hash:
            '0xcf8e55b51027342537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734afce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da',
        submission_time: 1613404086,
        address: 'boa1xrzwvvw6l6d9k84ansqgs9yrtsetpv44wfn8zm9a7lehuej3ssskxth867s',
        amount: '1663400000',
        fee: '0',
    },
    {
        tx_hash:
            '0xcf8e55b51027342537ebbdfc503146033fcd8091054913e78d6a858125f892a24b0734afce7154fdde85688ab1700307b999b2e5a17a724990bb83d3785e89da',
        submission_time: 1613404086,
        address: 'boa1xrgr66gdm5je646x70l5ar6qkhun0hg3yy2eh7tf8xxlmlt9fgjd2q0uj8p',
        amount: '24398336600000',
        fee: '0',
    },
];

export class TestStoa {
    /**
     * The bind port
     */
    private readonly port: number;

    /**
     * The application of express module
     */
    protected app: express.Application;

    /**
     * The Http server
     */
    protected server: http.Server | null = null;

    /**
     * Constructor
     * @param port The bind port
     */
    constructor(port: number | string) {
        if (typeof port == 'string') this.port = parseInt(port, 10);
        else this.port = port;

        this.app = express();
    }

    /**
     * Start the web server
     */
    public start(): Promise<void> {
        // http://localhost/validators
        this.app.get(`/validators`, (req: express.Request, res: express.Response) => {
            let height: number = Number(req.query.height);

            if (!Number.isNaN(height) && (!Number.isInteger(height) || height < 0)) {
                res.status(400).send('The Height value is not valid.');
                return;
            }

            let enrolled_height: number = 0;
            if (Number.isNaN(height)) height = enrolled_height;

            for (let idx = 0; idx < sample_validators.length; idx += 1) {
                const elem = sample_validators[idx];
                const distance = height - enrolled_height;
                if (distance !== elem.preimage.height) {
                    elem.preimage.height = distance;
                    elem.preimage.hash = getPreimageAt(sample_validators_preimage[idx], distance);
                }
            }

            for (let elem of sample_validators) {
                elem.preimage.height = height - enrolled_height;
            }

            res.status(200).send(JSON.stringify(sample_validators));
            console.log('/validators res = ', sample_validators);
        });

        // http://localhost/validator
        this.app.get(`/validator/:address`, (req: express.Request, res: express.Response) => {
            let height: number = Number(req.query.height);
            let address: string = String(req.params.address);

            console.log(`/validator/${address} req`);

            if (!Number.isNaN(height) && (!Number.isInteger(height) || height < 0)) {
                res.status(400).send('The Height value is not valid.');
                return;
            }

            let enrolled_height: number = 0;
            if (Number.isNaN(height)) height = enrolled_height;

            for (let idx = 0; idx < sample_validators.length; idx += 1) {
                const elem = sample_validators[idx];
                if (elem.address === address) {
                    const distance = height - enrolled_height;
                    if (distance !== elem.preimage.height) {
                        elem.preimage.height = distance;
                        elem.preimage.hash = getPreimageAt(sample_validators_preimage[idx], distance);
                    }
                    res.status(200).send(JSON.stringify([elem]));
                    console.log(`/validator/${address} res = `, elem);
                    return;
                }
            }

            res.status(204).send();
            console.log(`/validator/${address} res = `);
        });

        // http://localhost/client_info
        this.app.get(`/client_info`, (req: express.Request, res: express.Response) => {
            res.status(200).send({
                "X-Client-Name": req.header("X-Client-Name"),
                "X-Client-Version": req.header("X-Client-Version"),
            });
        });

        // http://localhost/utxo
        this.app.get(`/utxo/:address`, (req: express.Request, res: express.Response) => {
            let address: boasdk.PublicKey = new boasdk.PublicKey(req.params.address);

            if (sample_utxo_address == address.toString()) {
                res.status(200).send(JSON.stringify(sample_utxo));
                return;
            }

            res.status(400).send();
        });

        // http://localhost/block_height
        this.app.get(`/block_height`, (req: express.Request, res: express.Response) => {
            const height = getBlockHeightAt(new Date()).toString();
            res.status(200).send(height);
        });

        this.app.get('/block_height_at/:_date', (req: express.Request, res: express.Response) => {
            const _date = Number(req.params._date);
            const height = getBlockHeightAt(new Date(_date * 1000)).toString();
            res.status(200).send(height);
        });

        this.app.get('/wallet/blocks/header', async (req: express.Request, res: express.Response) => {
            const height = req.query.height ? Number(req.query.height) : getBlockHeightAt(new Date());
            res.status(200).send(getWhenAtBlock(height));
        });

        // http://localhost/transaction/fees
        this.app.get(`/transaction/fees/:tx_size`, (req: express.Request, res: express.Response) => {
            let size: string = req.params.tx_size.toString();

            if (!boasdk.Utils.isPositiveInteger(size)) {
                res.status(400).send(`Invalid value for parameter 'tx_size': ${size}`);
                return;
            }

            let tx_size = JSBI.BigInt(size);
            let factor = JSBI.BigInt(200);
            let minimum = JSBI.BigInt(100_000); // 0.01BOA
            let medium = JSBI.multiply(tx_size, factor);
            if (JSBI.lessThan(medium, minimum)) medium = JSBI.BigInt(minimum);

            let width = JSBI.divide(medium, JSBI.BigInt(10));
            let high = JSBI.add(medium, width);
            let low = JSBI.subtract(medium, width);
            if (JSBI.lessThan(low, minimum)) low = JSBI.BigInt(minimum);

            let data = {
                tx_size: JSBI.toNumber(tx_size),
                high: high.toString(),
                medium: medium.toString(),
                low: low.toString(),
            };

            res.status(200).send(JSON.stringify(data));
        });

        this.app.get(`/wallet/transactions/history/:address`, (req: express.Request, res: express.Response) => {
            let address: string = String(req.params.address);
            if (boasdk.PublicKey.validate(address) != '') {
                res.status(400).send(`Invalid value for parameter 'address': ${address}`);
                return;
            }

            const pageSize = Number(req.query.pagetSize || '100');
            const page = Number(req.query.page || '1');

            const txs_history = list_tx_history.filter(tx_history => tx_history.address === address);
            const minIdx = (page - 1) * pageSize;
            const maxIdx = page * pageSize;
            const paged_txs_history = txs_history.filter((value, index) => index >= minIdx && index < maxIdx);
            res.status(200).send(JSON.stringify(paged_txs_history));
        });

        this.app.get(`/wallet/transaction/overview/:hash`, (req: express.Request, res: express.Response) => {
            let tx_hash: boasdk.Hash;
            try {
                tx_hash = new boasdk.Hash(String(req.params.hash));
                res.status(200).send(JSON.stringify(sample_tx_overview));
            } catch (error) {
                res.status(400).send(`Invalid value for parameter 'hash': ${String(req.params.hash)}`);
            }
        });

        this.app.get(`/wallet/transactions/pending/:address`, (req: express.Request, res: express.Response) => {
            let address: string = String(req.params.address);
            if (boasdk.PublicKey.validate(address) != '') {
                res.status(400).send(`Invalid value for parameter 'address': ${address}`);
                return;
            }
            res.status(200).send(JSON.stringify(sample_txs_pending));
        });

        // http://localhost/transaction/pending
        this.app.get(`/transaction/pending/:hash`, (req: express.Request, res: express.Response) => {
            let hash: string = String(req.params.hash);

            let tx_hash: boasdk.Hash;
            try
            {
                tx_hash = new boasdk.Hash(hash);
            }
            catch (error)
            {
                res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
                return;
            }

            let sample_tx_hash = new boasdk.Hash(
                '0x4c1d71415c9ec7b182438e8bb669e324dde9be93b9c223a2ca831689d2e9598' +
                    'c628d07c84d3ee0941e9f6fb597faf4fe92518fa35e577ba12125919c0501d4bd',
            );

            if (Buffer.compare(tx_hash.data, sample_tx_hash.data) != 0) {
                res.status(204).send(`No pending transactions. hash': (${hash})`);
            } else {
                res.status(200).send(JSON.stringify(sample_tx));
            }
        });

        // http://localhost/transaction
        this.app.get(`/transaction/:hash`, (req: express.Request, res: express.Response) => {
            let hash: string = String(req.params.hash);

            let tx_hash: boasdk.Hash;
            try
            {
                tx_hash = new boasdk.Hash(hash);
            }
            catch (error)
            {
                res.status(400).send(`Invalid value for parameter 'hash': ${hash}`);
                return;
            }

            const sample_tx = map_sample_tx.get(tx_hash.toString());
            if (sample_tx) {
                res.status(200).send(JSON.stringify(sample_tx));
            } else {
                res.status(204).send(`No pending transactions. hash': (${hash})`);
            }
        });
        this.app.get(`${test_app_root}/qrcode/login/:index`, (req: express.Request, res: express.Response) => {
            const index = parseInt(req.params.index, 10);
            if (index < 0) {
                res.status(400).send('invalid index range');
                return;
            } else if (index >= sample_validators_seed.length) {
                for (let i = sample_validators_seed.length; i <= index; i += 1) {
                    makeNewValidator();
                }
            }

            console.log('/qrcode/login index = ', index);

            const validator_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey(sample_validators_seed[index]));
            const temporary_key = boasdk.KeyPair.random();
            const expires = new Date(Date.now() + 24 * 3600 * 1000);
            const voter_card = new boasdk.VoterCard(
                validator_key.address,
                temporary_key.address,
                expires.toISOString(),
            );
            voter_card.signature = validator_key.sign<boasdk.VoterCard>(voter_card);

            const voterLogin = {
                private_key: temporary_key.secret.toString(false),
                voter_card: {
                    validator: validator_key.address.toString(),
                    address: temporary_key.address.toString(),
                    expires: expires.toISOString(),
                    signature: voter_card.signature.toString(),
                },
            };

            const svg = new QRCode(JSON.stringify(voterLogin)).svg();
            const body = `
<!DOCTYPE html>
<html>
<body>
<div id="container">${svg}</div>
</body>
</html>
`;
            res.status(200).send(body);
        });
        this.app.get(`${test_app_root}/qrcode/vote/:index/:height`, (req: express.Request, res: express.Response) => {
            const index = parseInt(req.params.index, 10);
            if (index < 0) {
                res.status(400).send('invalid index range');
                return;
            } else if (index >= sample_validators_preimage.length) {
                for (let i = sample_validators_preimage.length; i <= index; i += 1) {
                    makeNewValidator();
                }
            }
            const height = parseInt(req.params.height, 10);
            if (height < 0) {
                res.status(400).send('invalid height');
                return;
            }

            console.log(`/qrcode/vote index = ${index}, height = ${height}`);

            const app_name = default_app_name;
            const pre_image = getPreimageAt(sample_validators_preimage[index], height);
            const key_agora_admin = boasdk.hashMulti(new boasdk.Hash(pre_image).data, Buffer.from(app_name));

            const validator_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey(sample_validators_seed[index]));
            const encryptionKey = new boasdk.EncryptionKey(
                app_name,
                new boasdk.Height(req.params.height),
                key_agora_admin, validator_key.address);
            encryptionKey.signature = validator_key.sign<boasdk.EncryptionKey>(encryptionKey);

            const voterCard = {
                app: app_name,
                height: height.toString(),
                value: key_agora_admin.toString(),
                validator: validator_key.address.toString(),
                signature: encryptionKey.signature.toString(),
            };

            const svg = new QRCode(JSON.stringify(voterCard)).svg();
            const body = `
<!DOCTYPE html>
<html>
<body>
<div id="container">${svg}</div>
</body>
</html>
`;
            res.status(200).send(body);
        });
        this.app.get(`${test_app_root}/proposal/fee`, (req: express.Request, res: express.Response) => {
            const { linkData } = req.query;
            if (!linkData) {
                res.status(400).send('missing parameter');
                return;
            }
            const { proposer_address, destination, amount, payload } = JSON.parse(linkData as string);
            if (!proposer_address || !destination || !amount || !payload) {
                res.status(400).send('missing parameter');
                return;
            }

            console.log('ProposalFee linkData = ', linkData);

            try {
                const payloadBuf = Buffer.from(payload as string || '', 'base64');
                const proposalFeeData = boasdk.ProposalFeeData.deserialize(SmartBuffer.fromBuffer(payloadBuf));

                makeProposalFeeTransaction(
                    proposer_address as string,
                    destination as string,
                    Number(amount as string),
                    proposalFeeData);

                res.status(200).send('Success');
            } catch (err) {
                console.log('make proposal fee transaction error : ', err);
                res.status(500).send('internal server error');
            }
        });
        this.app.get(`${test_app_root}/proposal/data`, (req: express.Request, res: express.Response) => {
            const { linkData } = req.query;
            if (!linkData) {
                res.status(400).send('missing parameter');
                return;
            }
            const { proposer_address, validators, voting_fee, payload } = JSON.parse(linkData as string);
            if (!proposer_address || !validators || !voting_fee || !payload) {
                res.status(400).send('missing parameter');
                return;
            }

            console.log('ProposalData linkData = ', linkData);

            try {
                const payloadBuf = Buffer.from(payload as string || '', 'base64');
                const proposalData = boasdk.ProposalData.deserialize(SmartBuffer.fromBuffer(payloadBuf));

                makeProposalDataTransaction(
                    proposer_address as string,
                    validators,
                    Number(voting_fee as string),
                    proposalData
                );

                res.status(200).send('Succeed to make proposal data');
            } catch (err) {
                console.log('make proposal data transaction error : ', err);
                res.status(500).send('internal server error');
            }
        });
        this.app.get(`${test_app_root}/proposal/vote`, (req: express.Request, res: express.Response) => {
            const { linkData } = req.query;
            if (!linkData) {
                res.status(400).send('missing parameter');
                return;
            }

            const { payload } = JSON.parse(linkData as string);
            if (!payload) {
                res.status(400).send('missing parameter');
                return;
            }

            console.log('ProposalVote linkData = ', linkData);

            try {
                const payloadBuf = Buffer.from(payload as string || '', 'base64');
                const ballotData = boasdk.BallotData.deserialize(SmartBuffer.fromBuffer(payloadBuf));

                makeBallotDataTransaction(ballotData.card.validator_address.toString(), default_voting_fee, ballotData);

                res.status(200).send('Succeed to make ballot data');
            } catch (err) {
                console.log('make proposal vote transaction error : ', err);
                res.status(500).send('internal server error');
            }
        });
        this.app.get(`${test_app_root}/proposal/result/:proposalId`, (req: express.Request, res: express.Response) => {
            const { proposalId } = req.params;
            if (!proposalId) {
                res.status(400).send('missing parameter');
                return;
            }

            res.status(200).send(`<!DOCTYPE html>
<html>
<body>
<div id="container">proposal : ${proposalId}</div>
</body>
</html>
`);
        });

        this.app.set('port', this.port);

        // Listen on provided this.port on this.address.
        return new Promise<void>((resolve, reject) => {
            // Create HTTP server.
            this.server = http.createServer(this.app);
            this.server.on('error', reject);
            this.server.listen(this.port, () => {
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.server != null)
                this.server.close((err?) => {
                    err === undefined ? resolve() : reject(err);
                });
            else resolve();
        });
    }
}

/**
 * This is an Agora node for testing.
 * The test code allows the Agora node to be started and shut down.
 */
class TestAgora {
    /**
     * The bind port
     */
    private readonly port: number;

    /**
     * The application of express module
     */
    protected app: express.Application;

    /**
     * The Http server
     */
    protected server: http.Server | null = null;

    /**
     * Constructor
     * @param port The bind port
     */
    constructor(port: number | string) {
        if (typeof port == 'string') this.port = parseInt(port, 10);
        else this.port = port;

        this.app = express();
    }

    /**
     * Start the web server
     */
    public start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false }));
        // parse application/json
        this.app.use(bodyParser.json());

        this.app.put('/transaction', (req: express.Request, res: express.Response) => {
            if (req.body.tx === undefined) {
                res.status(400).send("Missing 'tx' object in body");
                return;
            }
            res.status(200).send();
        });

        this.app.set('port', this.port);

        // Listen on provided this.port on this.address.
        return new Promise<void>((resolve, reject) => {
            // Create HTTP server.
            this.server = http.createServer(this.app);
            this.server.on('error', reject);
            this.server.listen(this.port, () => {
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.server != null)
                this.server.close((err?) => {
                    err === undefined ? resolve() : reject(err);
                });
            else resolve();
        });
    }
}

async function startTest() {
    const stoa_server = new TestStoa(5000);
    await stoa_server.start();

    const agora_server = new TestAgora(2826);
    await agora_server.start();
}

boasdk.SodiumHelper.assign(new BOASodium());
boasdk.SodiumHelper.init()
    .then(async () => {
        try {
            addSampleValidator();
            await startTest();
        } catch (err) {
            console.log('main error ', err);
        }
    })
    .catch((err) => {
        console.log('boasdk init error ', err);
    });
