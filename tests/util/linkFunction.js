const axios = require('axios');

async function openProposalFeeLink(linkData) {
    const walletFeeUrl = process.env.WALLET_FEE_URL || 'http://192.168.0.5:5000/voteratest/proposal/fee?linkData=';
    const redirectUrl = `${walletFeeUrl}${encodeURIComponent(JSON.stringify(linkData))}`;
    try {
        await axios.get(redirectUrl);
    } catch (err) {
        console.log('openProposalFeeLink error : ', err);
        throw err;
    }
}

async function openProposalVoteFeeLink(linkData) {
    const walletVoteFeeUrl = process.env.WALLET_DATA_URL || 'http://192.168.0.5:5000/voteratest/proposal/data?linkData=';
    const redirectUrl = `${walletVoteFeeUrl}${encodeURIComponent(JSON.stringify(linkData))}`;
    try {
        await axios.get(redirectUrl);
    } catch (err) {
        console.log('openProposalVoteFeeLink error : ', err);
        throw err;
    }
}

async function openProposalVoteLink(linkData) {
    const walletVoteUrl = process.env.WALLET_VOTE_URL || 'http://192.168.0.5:5000/voteratest/proposal/vote?linkData=';
    const redirectUrl = `${walletVoteUrl}${encodeURIComponent(JSON.stringify(linkData))}`;
    try {
        await axios.get(redirectUrl);
    } catch (err) {
        console.log('openProposalVoteLink error : ', err);
        throw err;
    }
}

module.exports = {
    openProposalFeeLink,
    openProposalVoteFeeLink,
    openProposalVoteLink,
};
