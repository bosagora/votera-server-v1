const boasdk = require('boa-sdk-ts');
const { BOASodium } = require('boa-sodium-ts');

const bcrypt = require('bcryptjs');

const fn = require('./util/appFunction');
const dn = require('./util/dbFunction');
const qn = require('./util/qrFunction');

const { TEST_VALIDATOR_SEED } = require('./util/config');

function makeTestVoterCard(seed) {
    const qrLogin = qn.makeQrcodeLogin(seed);
    return fn.parseValidatorLogin(qrLogin);
}

async function addTestMember(email, password) {
    const role = await dn.dbGetUserRole('Authenticated');
    const voter_card = makeTestVoterCard(TEST_VALIDATOR_SEED);
    const passwd = fn.generateHashPin(password, voter_card.validator);

    let userDoc = {
        confirmed: true,
        blocked: false,
        username: 'User' + Math.floor(Math.random() * 10000),
        email,
        password: bcrypt.hashSync(passwd, 10),
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
        role: role._id
    };

    let user = await dn.dbUpdateUser(email, userDoc);
    let userId;
    if (user.upsertedCount > 0) {
        userId = user.upsertedId;
    } else if (user.modifiedCount > 0) {
        user = await dn.dbGetUser(email);
        userId = user._id;
    } else {
        throw new Error('Failed to get User with email : ', email);
    }

    let memberDoc = {
        status: 'OPEN',
        username: 'Node' + Math.floor(Math.random() * 10000),
        address: voter_card.validator,
        lastAccessTime: new Date(),
        voterCard: voter_card.voter_card,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: userId,
    };

    let member = await dn.dbUpdateMember(voter_card.validator, memberDoc);
    let memberId;
    if (member.upsertedCount > 0) {
        memberId = member.upsertedId;
    } else if (member.modifiedCount > 0) {
        member = await dn.dbGetMember(voter_card.validator);
        memberId = member._id;
    } else {
        throw new Error('Failed to get Member with address : ', voter_card.validator);
    }

    return {
        userId,
        memberId,
    };
}

async function main() {
    if (!process.env.TEST_IDENTIFIER || !process.env.TEST_PASSWORD) {
        console.log('Empty TEST_IDENTIFIER or TEST_PASSWORD');
        return;
    }

    try {
        await dn.dbOpen();
        await addTestMember(process.env.TEST_IDENTIFIER, process.env.TEST_PASSWORD);
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
        console.log('sodiumHelper init failed : ', err);
    });
