const { MongoClient, ObjectId } = require('mongodb');

function getDatabaseUrl() {
    const databaseHost = process.env.DATABASE_HOST || 'localhost';
    const databasePort = process.env.DATABASE_PORT || '27017';
    const adminDatabase = process.env.AUTHENTICATION_DATABASE || 'admin';

    if (process.env.DATABASE_USERNAME && process.env.DATABASE_PASSWORD) {
        return `mongodb://${process.env.DATABASE_USERNAME}:${encodeURIComponent(process.env.DATABASE_PASSWORD)}@${databaseHost}:${databasePort}/?authSource=${adminDatabase}`;
    } else {
        return `mongodb://${databaseHost}:${databasePort}`;
    }
}

var client;
var database;

async function dbOpen() {
    client = new MongoClient(getDatabaseUrl(), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    await client.connect();
    database = client.db(process.env.DATABASE_NAME || 'votera');
}

async function dbClose() {
    await client.close();
}

async function dbGetProposal(id) {
    const dbCollection = database.collection('proposals');
    return await dbCollection.findOne({ _id: ObjectId(id) });
}

async function dbGetProposalById(proposalId) {
    const dbCollection = database.collection('proposals');
    return await dbCollection.findOne({ proposalId });
}

async function dbUpdateProposal(id, updateDoc) {
    const dbCollection = database.collection('proposals');
    return await dbCollection.updateOne({ _id: ObjectId(id) }, { $set: updateDoc });
}

function getProposalAssessPeriod(proposal) {
    return proposal.assessPeriod[0];
}

function getProposalVotePeriod(proposal) {
    return proposal.votePeriod[0];
}

async function dbGetCommonPeriod(period) {
    const commonPeriods = database.collection('components_common_periods');
    return await commonPeriods.findOne({ _id: ObjectId(period.ref) });
}

async function dbUpdateCommonPeriod(period, updateDoc) {
    const commonPeriods = database.collection('components_common_periods');
    return await commonPeriods.updateOne({ _id: ObjectId(period.ref) }, { $set: updateDoc });
}

async function dbGetUserRole(role) {
    const userRoles = database.collection('users-permissions_role');
    return await userRoles.findOne({ name: role });
}

async function dbGetUser(email) {
    const users = database.collection('users-permissions_user');
    return await users.findOne({ email });
}

async function dbUpdateUser(email, userDoc) {
    const users = database.collection('users-permissions_user');
    return await users.updateOne(
        { email }, { $set: userDoc }, { upsert: true }
    );
}

async function dbGetMember(address) {
    const members = database.collection('members');
    return await members.findOne({ address });
}

async function dbUpdateMember(address, memberDoc) {
    const members = database.collection('members');
    return await members.updateOne(
        { address }, { $set: memberDoc }, { upsert: true }
    );
}

module.exports = {
    dbOpen,
    dbClose,
    dbGetProposal,
    dbGetProposalById,
    dbUpdateProposal,
    getProposalAssessPeriod,
    getProposalVotePeriod,
    dbGetCommonPeriod,
    dbUpdateCommonPeriod,
    dbGetUserRole,
    dbGetUser,
    dbUpdateUser,
    dbGetMember,
    dbUpdateMember,
};
