'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

const { ApolloError } = require('apollo-server-errors');
const boasdk = require('boa-sdk-ts');
const crypto = require('crypto');

const BOA_DECIMAL = 10000000;

async function uniqueCheck(id) {
    try {
        const idFound = await strapi.services.proposal.find({ proposalId: id });
        if (idFound.length) return true;
        else return false;
    } catch (err) {
        console.log(err);
        return false;
    }
}

/**
 * Korean Timezone (GMT+9) 기준 시간으로 변경
 * @param {*} period
 * @returns
 */
function confirmDateOnly(period) {
    const data = new Date(period);
    return new Date(`${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()} GMT+9`).getTime();
}

async function getPeriodHeight(period) {
    const startDate = confirmDateOnly(period.begin);
    const endDate = confirmDateOnly(period.end) + 86400000;

    const start_height = await strapi.services.boaclient.getHeightAt(new Date(startDate));
    const end_height = (await strapi.services.boaclient.getHeightAt(new Date(endDate))) - 1;

    return { start_height, end_height };
}

async function getUploadFileInfo(id) {
    const file = await strapi.query('file', 'upload').findOne({ id });
    if (!file) {
        return {};
    } else {
        return {
            name: file.name,
            url: file.url,
            size: file.size,
            doc_hash: file.doc_hash,
        };
    }
}

async function getUploadFilesInfo(ids) {
    const infos = await Promise.all(ids.map(async (id) => getUploadFileInfo(id)));
    return infos;
}

async function getProposalDocHash(proposal, uId, start_height, end_height) {
    const proposalInfo = {
        proposalId: uId,
        name: proposal.name,
        description: proposal.description,
        type: proposal.type,
        fundingAmount: proposal.fundingAmount,
        logo: proposal.logo?.id ? await getUploadFileInfo(proposal.logo.id) : {},
        attachment: proposal.attachment
            ? await getUploadFilesInfo(proposal.attachment.map((attachment) => attachment.id))
            : [],
        vote_start_height: start_height,
        vote_end_height: end_height,
    };

    return strapi.services.boaclient.getProposalDocHash(proposalInfo);
}

module.exports = {
    async createProposal(proposal) {
        /**
         * 1. 공지 Board 생성
         * 2. 논의하기 Board 생성
         * 3. 평가하기 Survey 생성
         * 4. 투표하기 Poll 생성
         */
        try {
            // data 유효성 확인
            if (!proposal.name) throw new Error('missing parameter');
            if (!proposal.votePeriod) throw new Error('missing parameter');
            if (!proposal.proposer_address) throw new Error('missing parameter');
            if (proposal.type === 'BUSINESS') {
                if (!proposal.fundingAmount) throw new Error('missing parameter');

                const fundingAmount = boasdk.JSBI.BigInt(proposal.fundingAmount);
                const agora = await strapi.services.agora.getAgora();
                const proposalRatio = boasdk.JSBI.BigInt(Math.round(agora.ProposalFeeRatio * BOA_DECIMAL));
                const proposalFee = boasdk.JSBI.divide(boasdk.JSBI.multiply(fundingAmount, proposalRatio), boasdk.JSBI.BigInt(BOA_DECIMAL));

                proposal.fundingAmount = fundingAmount.toString();
                proposal.proposal_fee = proposalFee.toString();
                proposal.proposal_fee_address = agora.ProposalFeeAddress;
            }

            let uId;
            do {
                uId = crypto.randomInt(100000000000, 1000000000000).toString();
            } while (await uniqueCheck(uId));

            const { start_height, end_height } = await getPeriodHeight(proposal.votePeriod);
            const proposal_begin = await strapi.services.boaclient.getCurrentBlockHeight();
            const proposal_doc_hash = await getProposalDocHash(proposal, uId, start_height, end_height);

            const createdNotice = await strapi.services.proposal.createNotice(proposal);
            const createdDiscussion = await strapi.services.proposal.createDiscussion(proposal);
            let assess_activity;

            if (proposal.type === 'BUSINESS') {
                assess_activity = await strapi.services.activity.createVoteraActivity({
                    data: {
                        type: 'SURVEY',
                        name: proposal?.name,
                        status: 'OPEN',
                    },
                });
            }

            const vote_activity = await strapi.services.activity.createVoteraActivity({
                data: {
                    type: 'POLL',
                    name: proposal?.name,
                    status: 'OPEN',
                },
            });

            if (
                !uId ||
                !createdNotice ||
                !createdDiscussion ||
                (proposal.type === 'BUSINESS' && !assess_activity) ||
                !vote_activity
            )
                throw new ApolloError('Create Proposal Error');

            let activities = [createdNotice.id, createdDiscussion.id, vote_activity.id];
            if (proposal.type === 'BUSINESS') {
                activities.push(assess_activity.id);
            }

            const proposalInput = {
                ...proposal,
                activities,
                proposalId: uId,
                vote_start_height: start_height,
                vote_end_height: end_height,
                doc_hash: proposal_doc_hash,
                proposal_begin,
                member_count: 1,
            };

            const createdProposal = await strapi.query('proposal').create(proposalInput);

            await strapi.query('member-role').create({
                member: proposal.creator,
                scope: 'PROPOSAL',
                status: 'NORMAL',
                type: 'ADMINISTRATOR',
                proposal: createdProposal.id,
            });

            return createdProposal;
        } catch (error) {
            console.log('create proposal error : ', error);
            throw new ApolloError('Create Proposal Error');
        }
    },
    async createNotice(proposal) {
        try {
            const activity = await strapi.query('activity').create({
                type: 'BOARD',
                // workspace,
                name: proposal?.name + '_NOTICE',
                // description: board.description,
                status: 'OPEN',
                // creator: createMember.id,
            });
            return activity;
        } catch (error) {
            throw new ApolloError('Create Notice Error');
        }
    },
    async createDiscussion(proposal) {
        try {
            const activity = await strapi.query('activity').create({
                type: 'BOARD',
                // workspace,
                name: proposal?.name + '_DISCUSSION',
                // description: board.description,
                status: 'OPEN',
                // creator: createMember.id,
            });
            return activity;
        } catch (error) {
            throw new ApolloError('Create Discussion Error');
        }
    },
    async joinProposal(id, member) {
        let proposal = await strapi.query('proposal').findOne({ id });
        if (!proposal) {
            return null;
        }

        try {
            await strapi.services.member.getVoterCardFromInput(member.voterCard);
        } catch (err) {
            return { invalidVoterCard: true };
        }

        const joined = await this.checkJoinMember(proposal.id, member.id);
        if (!joined) {
            await strapi.query('member-role').create({
                type: 'USER',
                scope: 'PROPOSAL',
                proposal: proposal.id,
                member: member.id,
                status: 'NORMAL',
            });

            proposal = await strapi.query('proposal').update({ id : proposal.id }, { $inc: { member_count: 1 } });
        }

        return { invalidVoterCard: false, proposal };
    },
    async proposalFee(id) {
        try {
            const proposal = await strapi.query('proposal').findOne({ id });
            if (!proposal) {
                return null;
            }

            if (proposal.type !== 'BUSINESS') {
                return { status: 'IRRELEVANT' };
            }

            if (!proposal.proposer_address) {
                return { status: 'INVALID' };
            } else if (!proposal.proposal_fee_address) {
                return { status: 'INVALID' };
            } else if (!proposal.proposal_fee) {
                return { status: 'INVALID' };
            }

            const feeResult = {
                proposer_address: proposal.proposer_address,
                destination: proposal.proposal_fee_address,
                amount: proposal.proposal_fee,
            };

            // check current status
            if (proposal.status === 'PENDING_ASSESS') {
                if (!proposal.tx_hash_proposal_fee) {
                    const assessPeriodBegin = new Date(proposal.assessPeriod.begin);
                    if (assessPeriodBegin.getTime() > Date.now()) {
                        feeResult.status = 'EXPIRED';
                        return feeResult;
                    }

                    const txResult = await strapi.services.boaclient.checkProposalFeeTransaction(
                        proposal.proposalId,
                        proposal.proposal_begin,
                        proposal.proposer_address,
                        proposal.proposal_fee_address,
                        proposal.proposal_fee,
                    );

                    if (txResult && txResult.result === strapi.services.boaclient.CHECK_RESULT_FOUND) {
                        if (txResult.tx_hash_proposal_fee) {
                            await strapi.query('proposal').update(
                                { id: proposal.id },
                                { tx_hash_proposal_fee: txResult.tx_hash_proposal_fee, status: 'ASSESS' },
                            );
                        }
                        feeResult.status = 'PAID';
                    } else {
                        feeResult.status = 'WAIT';
                    }
                    return feeResult;
                } else {
                    feeResult.status = 'PAID';
                    return feeResult;
                }
            } else if (proposal.status === 'REJECT' || proposal.status === 'DELETED') {
                return { status: 'IRRELEVANT' };
            } else {
                // ASSESS, PENDING_VOTE, VOTE, CLOSED
                if (!proposal.tx_hash_proposal_fee) {
                    return { status: 'INVALID' };
                } else {
                    feeResult.status = 'PAID';
                    return feeResult;
                }
            }
        } catch (error) {
            throw new ApolloError('ProposalFeed Error');
        }
    },
    async voteFee(id) {
        try {
            const proposal = await strapi.query('proposal').findOne({ id });
            if (!proposal) {
                return null;
            }

            if (proposal.status === 'PENDING_ASSESS' || proposal.status === 'ASSESS') {
                return { status: 'IRRELEVANT' };
            }

            if (!proposal.proposer_address) {
                return { status: 'INVALID' };
            } else if (proposal.type === 'BUSINESS') {
                if (!proposal.proposal_fee_address) {
                    return { status: 'INVALID' };
                } else if (!proposal.proposal_fee) {
                    return { status: 'INVALID' };
                } else if (!proposal.tx_hash_proposal_fee) {
                    return { status: 'IRRELEVANT' };
                }
            }

            if (proposal.status === 'PENDING_VOTE') {
                if (!proposal.tx_hash_vote_fee) {
                    const currentBlockHeight = await strapi.services.boaclient.getCurrentBlockHeight();
                    if (currentBlockHeight >= proposal.vote_start_height) {
                        await strapi.query('proposal').update({ id: proposal.id }, { status: 'CANCEL' });

                        return {
                            status: 'EXPIRED',
                            proposal,
                        };
                    }

                    if (!proposal.vote_fee || !proposal.validators) {
                        const validators = await strapi.services.boaclient.getAllValidators();
                        const vote_fee = await strapi.services.boaclient.getVotingFee();

                        if (validators) {
                            const proposalVoteFee = boasdk.JSBI.multiply(vote_fee, boasdk.JSBI.BigInt(validators.length));
                            proposal.vote_fee = proposalVoteFee.toString();
                            proposal.validators = JSON.stringify(validators.map((validator) => validator.address));

                            await strapi
                                .query('proposal')
                                .update(
                                    { id: proposal.id },
                                    { vote_fee: proposal.vote_fee, validators: proposal.validators },
                                );
                            return {
                                status: 'WAIT',
                                proposal,
                            };
                        } else {
                            return {
                                status: 'INVALID',
                                proposal,
                            };
                        }
                    } else {
                        const validators = JSON.parse(proposal.validators);
                        const expected_data = strapi.services.boaclient.getExpectedData(proposal);

                        const txResult = await strapi.services.boaclient.checkProposalDataTransaction(
                            proposal.proposer_address,
                            proposal.proposal_begin,
                            expected_data,
                            validators,
                        );

                        if (txResult && txResult.result === strapi.services.boaclient.CHECK_RESULT_FOUND) {
                            if (txResult.tx_hash_vote_fee) {
                                await strapi
                                    .query('proposal')
                                    .update({ id: proposal.id }, { tx_hash_vote_fee: txResult.tx_hash_vote_fee });
                            }

                            return {
                                status: 'PAID',
                                proposal,
                            };
                        } else {
                            return {
                                status: 'WAIT',
                                proposal,
                            };
                        }
                    }
                } else {
                    return {
                        status: 'PAID',
                        proposal,
                    };
                }
            } else if (proposal.status === 'REJECT' || proposal.status === 'DELETED') {
                return { status: 'IRRELEVANT' };
            } else {
                // VOTE, CLOSED
                if (!proposal.tx_hash_vote_fee) {
                    return { status: 'INVALID' };
                } else {
                    return {
                        status: 'PAID',
                        proposal,
                    };
                }
            }
        } catch (error) {
            throw new ApolloError('ProposalVoteFee Error');
        }
    },
    async confirmProposalCreator(proposal, user) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(proposal.creator, user);
        if (!member) {
            throw new Error('creator.notFound');
        } else if (!authorized) {
            throw new Error('Not Authorized');
        }
        if (proposal.proposer_address !== member.address) {
            throw new Error('proposer_address.invalid');
        }
        const voter_card = await strapi.services.member.getVoterCardFromInput(member.voterCard);
        return {
            member,
            voter_card,
        };
    },
    async checkAssessPass(proposal) {
        return new Promise((resolve) => {
            // 지금은 무조건 다 통과
            resolve(true);
        });
    },
    async batchJob() {
        console.log(`batch:proposal batchJob at ${new Date()}`);

        const blockHeight = await strapi.services.boaclient.getCurrentBlockHeight();
        const proposals = await strapi
            .query('proposal')
            .find({ status_in: ['PENDING_ASSESS', 'ASSESS', 'PENDING_VOTE', 'VOTE'], _limit: 5000 });
        for (let i = 0; i < proposals.length; i += 1) {
            const proposal = proposals[i];
            try {
                if (proposal.status === 'PENDING_ASSESS') {
                    // PENDING_ASSESS -> ASSESS or CANCEL
                    const txResult = await strapi.services.boaclient.checkProposalFeeTransaction(
                        proposal.proposalId,
                        proposal.proposal_begin,
                        proposal.proposer_address,
                        proposal.proposal_fee_address,
                        proposal.proposal_fee,
                    );
                    if (txResult && txResult.result === strapi.services.boaclient.CHECK_RESULT_FOUND) {
                        if (txResult.tx_hash_proposal_fee) {
                            await strapi.query('proposal').update(
                                { id: proposal.id },
                                { tx_hash_proposal_fee: txResult.tx_hash_proposal_fee, status: 'ASSESS' },
                            );
                        } else {
                            strapi.log.error(
                                { proposal: proposal.proposalId },
                                'found transaction but no tx_hash_proposal_fee',
                            );
                        }
                    } else if (proposal.assessPeriod) {
                        const endDate = confirmDateOnly(proposal.assessPeriod.end) + 86400000;
                        const now = Date.now();
                        if (now >= endDate) {
                            await strapi.query('proposal').update({ id: proposal.id }, { staus: 'CANCEL' });
                        } else if (now >= endDate - 86400000) {
                            // notify to pay proposal_fee
                            strapi.services.notification.onProposalTimeAlarm(proposal)
                                .catch((err) => {
                                    strapi.log.warn({err, proposal}, 'notification.proposalTimeAlarm exception');
                                });
                        }
                    }
                } else if (proposal.status === 'ASSESS') {
                    // ASSESS -> PENDING_VOTE or REJECT
                    const endDate = confirmDateOnly(proposal.assessPeriod.end) + 86400000;
                    const now = Date.now();
                    if (now >= endDate) {
                        const passed = await this.checkAssessPass(proposal);
                        if (passed) {
                            // ? 이때 validators 목록을 확정을 지어야 되나?
                            await strapi.query('proposal').update({ id: proposal.id }, { status: 'PENDING_VOTE' });
                        } else {
                            await strapi.query('proposal').update({ id: proposal.id }, { status: 'REJECT' });
                        }
                    } else if (now >= endDate - 86400000) {
                        strapi.services.notification.onProposalTimeAlarm(proposal)
                            .catch((err) => {
                                strapi.log.warn({err, proposal}, 'notification.proposalTimeAlaram exception');
                            });
                    }
                } else if (proposal.status === 'PENDING_VOTE') {
                    // PENDING_VOTE -> VOTE or CANCEL
                    const alarmHeight = proposal.vote_start_height - strapi.services.boaclient.BLOCKS_PER_DAY;
                    if (blockHeight < proposal.vote_start_height) {
                        if (!proposal.tx_hash_vote_fee || proposal.tx_hash_vote_fee === '') {
                            if (proposal.validators) {
                                const validators = JSON.parse(proposal.validators);
                                const expected_data = strapi.services.boaclient.getExpectedData(proposal);

                                const txResult = await strapi.services.boaclient.checkProposalDataTransaction(
                                    proposal.proposer_address,
                                    proposal.proposal_begin,
                                    expected_data,
                                    validators,
                                );

                                if (txResult && txResult.result === strapi.services.boaclient.CHECK_RESULT_FOUND) {
                                    if (txResult.tx_hash_vote_fee) {
                                        await strapi
                                            .query('proposal')
                                            .update(
                                                { id: proposal.id },
                                                { tx_hash_vote_fee: txResult.tx_hash_vote_fee },
                                            );
                                    } else {
                                        strapi.log.error(
                                            { proposal: proposal.proposalId },
                                            'found transaction but no tx_hash_vote_fee',
                                        );
                                    }
                                } else if (blockHeight > alarmHeight) {
                                    // notify to pay vote_fee
                                    strapi.services.notification.onProposalTimeAlarm(proposal)
                                        .catch((err) => {
                                            strapi.log.warn({err, proposal}, 'notification.proposalTimeAlarm exception');
                                        });
                                }
                            } else if (blockHeight > alarmHeight) {
                                // notify to pay vote_fee
                                strapi.services.notification.onProposalTimeAlarm(proposal)
                                    .catch((err) => {
                                        strapi.log.warn({err, proposal}, 'notification.proposalTimeAlarm exception');
                                    });
                            }
                        }
                    } else if (blockHeight >= proposal.vote_start_height && blockHeight < proposal.vote_end_height) {
                        if (!proposal.tx_hash_vote_fee || proposal.tx_hash_vote_fee === '') {
                            const validators = JSON.parse(proposal.validators);
                            const expected_data = strapi.services.boaclient.getExpectedData(proposal);

                            const txResult = await strapi.services.boaclient.checkProposalDataTransaction(
                                proposal.proposer_address,
                                proposal.proposal_begin,
                                expected_data,
                                validators,
                            );

                            if (txResult && txResult.result === strapi.services.boaclient.CHECK_RESULT_FOUND) {
                                if (txResult.tx_hash_vote_fee) {
                                    // change to VOTE
                                    await strapi
                                        .query('proposal')
                                        .update(
                                            { id: proposal.id },
                                            { tx_hash_vote_fee: txResult.tx_hash_vote_fee, status: 'VOTE' },
                                        );
                                    publishFeedToManager(proposal.id, 'VOTING');
                                } else {
                                    strapi.log.error(
                                        { proposal: proposal.proposalId },
                                        'found transaction but no tx_hash_vote_fee',
                                    );
                                }
                            } else {
                                // change to CANCEL
                                await strapi.query('proposal').update({ id: proposal.id }, { status: 'CANCEL' });
                            }
                        } else {
                            // change to VOTE
                            await strapi.query('proposal').update({ id: proposal.id }, { status: 'VOTE' });
                            publishFeedToManager(proposal.id, 'VOTING');
                        }
                    } else if (blockHeight >= proposal.vote_end_height) {
                        // change to CANCEL
                        await strapi.query('proposal').update({ id: proposal.id }, { status: 'CANCEL' });
                    }
                } else if (proposal.status === 'VOTE') {
                    // VOTE -> CLOSED
                    const alarmHeight = proposal.vote_end_height - strapi.services.boaclient.BLOCKS_PER_DAY;
                    if (blockHeight > proposal.vote_end_height) {
                        await strapi.query('proposal').update({ id: proposal.id }, { status: 'CLOSED' });
                        publishFeedToManager(proposal.id, 'CLOSED');
                    } else if (blockHeight > alarmHeight) {
                        strapi.services.notification.onProposalTimeAlarm(proposal)
                            .catch((err) => {
                                strapi.log.warn({err, proposal}, 'notification.proposalTimeAlarm exception');
                            });
                    }
                }
            } catch (err) {
                console.log(`${proposal.proposalId} catch error : `, err);
                strapi.log.warn({ proposal: proposal.proposalId, err }, 'catch error during batch job');
            }
        }
    },
    async checkJoinMember(proposalId, memberId) {
        // 이미 join 되었는지 확인 (type, status 는 우선은 확인하지 않음)
        const found = await strapi.query('member-role').findOne({
            scope: 'PROPOSAL',
            member: memberId,
            proposal: proposalId
        });
        return (found) ? true : false;
    }
};
