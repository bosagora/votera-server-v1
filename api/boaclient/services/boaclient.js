const boasdk = require('boa-sdk-ts');
const BOASodium = require('boa-sodium-ts');
const URI = require('urijs');
const sb = require('smart-buffer');
const stringify = require('fast-json-stable-stringify');

const CHECK_RESULT_NOTFOUND = 0;
const CHECK_RESULT_FOUND = 1;
const CHECK_RESULT_INCONSISTENT = 2;
const CHECK_RESULT_INSUFFICIENT = 3;

module.exports = {

    async initialize() {
        if (!strapi.config.boaclient.stoa.url || !strapi.config.boaclient.agora.url) {
            throw new Error('BOAClient initialize failed : missing stoa or agora url');
        }

        let stoa_uri = URI(strapi.config.boaclient.stoa.url)
            .port(strapi.config.boaclient.stoa.port);
        let agora_uri = URI(strapi.config.boaclient.agora.url)
            .port(strapi.config.boaclient.agora.port);

        boasdk.SodiumHelper.assign(new BOASodium.BOASodium());
        await boasdk.SodiumHelper.init()

        this.boaClient = new boasdk.BOAClient(stoa_uri.toString(), agora_uri.toString());
    },

    async getValidVoterCard(voterString) {
        try {
            if (!voterString) {
                strapi.log.debug('empty voterString');
                return null;
            }
            const voterCard = boasdk.VoterCard.deserialize(sb.SmartBuffer.fromBuffer(Buffer.from(voterString, 'base64')));
            if (!voterCard.verify()) {
                strapi.log.debug('voterCard verify failed');
                return null;
            }
            const validators = await this.boaClient.getValidator(voterCard.validator_address.toString());
            if (!validators || validators.length === 0) {
                strapi.log.debug('cannot found validator address');
                return null;
            }
            return voterCard;
        } catch (err) {
            strapi.log.debug(err, 'catch exception while getValidatorCard');
            return null;
        }
    },

    async getCurrentBlockHeight() {
        const currentHeight = await this.boaClient.getBlockHeight();
        return boasdk.JSBI.toNumber(currentHeight);
    },

    async getAllValidators(height) {
        const validators = await this.boaClient.getAllValidators(height);
        return validators;
    },

    async isValidValidator(address, height) {
        try {
            if (!address) {
                return false;
            }

            const validators = await this.boaClient.getValidator(address, height);
            if (validators && validators.length > 0) {
                return true;
            }
        } catch (err) {
            strapi.log.warn(err, 'validValidator failed %s at %d', address, height);
        }
        return false;
    },

    async getHeightAt(date) {
        const height = await this.boaClient.getHeightAt(date);
        return height;
    },

    async getVotingFee() {
        return await this.boaClient.getVotingFee(strapi.config.boaclient.service.vote_payload_size);
    },

    CHECK_RESULT_NOTFOUND: CHECK_RESULT_NOTFOUND,
    CHECK_RESULT_FOUND: CHECK_RESULT_FOUND,
    CHECK_RESULT_INCONSISTENT: CHECK_RESULT_INCONSISTENT,
    CHECK_RESULT_INSUFFICIENT: CHECK_RESULT_INSUFFICIENT,
    BLOCKS_PER_DAY: 144,
    
    /**
     * @returns
     * result
     *  0 : Not found
     *  1 : found valid proposal fee transaction
     *  2 : found proposal fee transaction but fee_address is inconsistent
     *  3 : found proposal fee transaction but 
     * tx_hash_proposal_fee
     */
    async checkProposalFeeTransaction(proposal_id, begin, address, fee_address, proposal_fee) {
        try {
            if (!address || !proposal_fee || !fee_address) {
                return { result: CHECK_RESULT_NOTFOUND };
            }

            const public_key = new boasdk.PublicKey(address);
            const expected_proposal_fee = boasdk.JSBI.BigInt(proposal_fee);

            let result = 0;
            let tx_hash_proposal_fee;
            let page = 1;
            let history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin);
            while (history && history.length > 0) {
                for (let idx = 0; idx < history.length; idx += 1) {
                    const item = history[idx];
                    if (item.display_tx_type !== 'payload') {
                        continue;
                    }

                    const tx = await this.boaClient.getTransaction(new boasdk.Hash(item.tx_hash));
                    const header = tx.payload.slice(1, 9);
                    if (Buffer.compare(Buffer.from(boasdk.ProposalFeeData.HEADER), header) !== 0) {
                        continue;
                    }

                    const payload = boasdk.ProposalFeeData.deserialize(sb.SmartBuffer.fromBuffer(tx.payload));
                    if (payload.app_name !== 'Votera' || payload.proposal_id !== proposal_id) {
                        continue;
                    }

                    const find_idx = tx.outputs.findIndex((o) => (new boasdk.PublicKey(o.lock.bytes).toString() === fee_address));
                    if (find_idx < 0) {
                        result = CHECK_RESULT_INCONSISTENT; // found proposal fee transaction but fee_address inconsistent
                        continue;
                    }

                    tx_hash_proposal_fee = item.tx_hash;

                    if (boasdk.JSBI.greaterThanOrEqual(tx.outputs[find_idx].value, expected_proposal_fee)) {
                        return { result: CHECK_RESULT_FOUND, tx_hash_proposal_fee };
                    }

                    result = CHECK_RESULT_INSUFFICIENT; // found proposal fee transaction but proposal_fee is smaller than expected
                }

                page += 1;
                history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin);
            }

            return { result, tx_hash_proposal_fee };
        } catch (err) {
            strapi.log.warn(err, 'checkProposalFeeTransaction proposal_id=%s address=%s', proposal_id, address);
        }

        return { result: CHECK_RESULT_NOTFOUND };
    },

    /**
     * 
     * @param {*} address 
     * @param {*} begin 
     * @param {*} expected_data 
     * @param {*} validators 
     * @returns
     * result
     *  0 : Not found
     *  1 : found valid proposal fee transaction
     *  2 : found proposal fee transaction but fee_address is inconsistent
     *  3 : found proposal fee transaction but 
     * tx_hash_vote_fee
     */
    async checkProposalDataTransaction(address, begin, expected_data, validators) {
        try {
            if (!address || !expected_data || !validators) {
                return { result: CHECK_RESULT_NOTFOUND };
            }

            const public_key = new boasdk.PublicKey(address);
            const vote_cost = boasdk.JSBI.divide(expected_data.vote_fee, boasdk.JSBI.BigInt(validators.length));

            let result = 0;
            let tx_hash_vote_fee;
            let page = 1;
            let history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin);
            while (history && history.length > 0) {
                for (let idx = 0; idx < history.length; idx += 1) {
                    const item = history[idx];
                    if (item.display_tx_type !== 'payload') {
                        continue;
                    }

                    const tx = await this.boaClient.getTransaction(new boasdk.Hash(item.tx_hash));
                    const header = tx.payload.slice(1, 9);
                    if (Buffer.compare(Buffer.from(boasdk.ProposalData.HEADER), header) !== 0) {
                        continue;
                    }

                    const payload = boasdk.ProposalData.deserialize(sb.SmartBuffer.fromBuffer(tx.payload));
                    if (payload.app_name !== expected_data.app_name || payload.proposal_id !== expected_data.proposal_id) {
                        continue;
                    }
                    if (payload.proposal_type !== expected_data.proposal_type
                        || payload.proposal_title !== expected_data.proposal_title
                        || boasdk.JSBI.notEqual(payload.vote_start_height, expected_data.vote_start_height)
                        || boasdk.JSBI.notEqual(payload.vote_end_height, expected_data.vote_end_height)
                        || Buffer.compare(payload.doc_hash.data, expected_data.doc_hash.data) !== 0
                        || boasdk.JSBI.notEqual(payload.vote_fee, expected_data.vote_fee)
                        || Buffer.compare(payload.proposer_address.data, expected_data.proposer_address.data) !== 0) {
                        result = CHECK_RESULT_INCONSISTENT; // found proposal data but data is inconsistent
                        continue;
                    }
                    if (payload.proposal_type === boasdk.ProposalType.Fund) {
                        if (boasdk.JSBI.notEqual(payload.fund_amount, expected_data.fund_amount)
                            || boasdk.JSBI.notEqual(payload.proposal_fee, expected_data.proposal_fee)
                            || Buffer.compare(payload.tx_hash_proposal_fee.data, expected_data.tx_hash_proposal_fee.data) !== 0
                            || Buffer.compare(payload.proposal_fee_address.data, expected_data.proposal_fee_address.data) !== 0) {
                            result = CHECK_RESULT_INCONSISTENT; // found proposal data but data is inconsistent
                            continue;
                        }
                    }

                    tx_hash_vote_fee = item.tx_hash;

                    let sum_vote_cost = boasdk.JSBI.BigInt(0);
                    let v_idx;
                    for (v_idx = validators.length - 1; v_idx >= 0; v_idx -= 1) {
                        const validator = validators[v_idx];
                        let find_idx = tx.outputs.findIndex((o) => (new boasdk.PublicKey(o.lock.bytes).toString() === validator));
                        if (find_idx < 0) {
                            break;
                        }
                        if (boasdk.JSBI.lessThan(tx.outputs[find_idx].value, vote_cost)) {
                            break;
                        }
                        sum_vote_cost = boasdk.JSBI.add(sum_vote_cost, tx.outputs[find_idx].value);
                    }
                    if (v_idx >= 0) {
                        result = CHECK_RESULT_INSUFFICIENT; // found proposal data transaction but vote_fee is smaller or missing
                        continue;
                    }
                    if (boasdk.JSBI.greaterThanOrEqual(sum_vote_cost, expected_data.vote_fee)) {
                        return { result: CHECK_RESULT_FOUND, tx_hash_vote_fee };
                    }

                    result = CHECK_RESULT_INSUFFICIENT; // found proposal data transaction but vote_fee is smaller or missing
                }

                page += 1;
                history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin);
            }

            return { result, tx_hash_vote_fee };
        } catch (err) {
            strapi.log.warn(err, 'checkProposalDataTransaction proposal_id=%s address=%s', expected_data.proposal_id, address);
        }

        return { result: CHECK_RESULT_NOTFOUND };
    },
    async getBallotData(address, app_name, proposal_id, begin, end) {
        try {
            if (!address) {
                return [];
            }

            const result = [];
            const public_key = new boasdk.PublicKey(address);

            let page = 1;
            let history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin, end);
            while (history && history.length) {
                for (let idx = 0; idx < history.length; idx += 1) {
                    const item = history[idx];
                    if (item.display_tx_type !== 'payload') {
                        continue;
                    }

                    const tx = await this.boaClient.getTransaction(new boasdk.Hash(item.tx_hash));
                    const header = tx.payload.slice(1, 9);
                    if (Buffer.compare(Buffer.from(boasdk.BallotData.HEADER), header) !== 0) {
                        continue;
                    }

                    const payload = boasdk.BallotData.deserialize(sb.SmartBuffer.fromBuffer(tx.payload));
                    if (!payload.card.verify() || payload.verify()) {
                        continue;
                    }

                    if (payload.app_name !== app_name || payload.proposal_id !== proposal_id) {
                        continue;
                    }

                    result.push(payload);
                }

                page += 1;
                history = await this.boaClient.getWalletTransactionsHistory(public_key, 100, page, ['payload'], begin);
            }

            return result;
        } catch (err) {
            strapi.log.warn(err, 'getBallotData proposal_id=%s address=%s', proposal_id, address);
        }

        return result;
    },

    async getProposalDocHash(proposalInfo) {
        /**
         * proposalInfo {
         *  proposalId: string;
         *  name: string;
         *  description: string;
         *  type: string;
         *  fundingAmount: string;
         *  logo: { name, url, size, doc_hash, }
         *  attachment: [ { name, url, size, doc_hash, } ]
         *  vote_start_height: JSBI
         *  vote_end_height: JSBI
         * }
         */
        console.log('proposalInfo = ', stringify(proposalInfo));
        return boasdk.hash(Buffer.from(stringify(proposalInfo), 'utf8')).toString();
    },

    getExpectedData(proposal) {
        const expected_data = {
            app_name: 'Votera',
            proposal_id: proposal.proposalId,
            proposal_type: proposal.type === 'SYSTEM' ? boasdk.ProposalType.System : boasdk.ProposalType.Fund,
            proposal_title: proposal.name,
            vote_start_height: boasdk.JSBI.BigInt(proposal.vote_start_height),
            vote_end_height: boasdk.JSBI.BigInt(proposal.vote_end_height),
            doc_hash: new boasdk.Hash(proposal.doc_hash),
            vote_fee: boasdk.JSBI.BigInt(proposal.vote_fee),
            proposer_address: new boasdk.PublicKey(proposal.proposer_address),
        };
        if (proposal.type === 'BUSINESS') {
            expected_data.fund_amount = boasdk.JSBI.BigInt(proposal.fundingAmount);
            expected_data.proposal_fee = boasdk.JSBI.BigInt(proposal.proposal_fee);
            expected_data.tx_hash_proposal_fee = new boasdk.Hash(proposal.tx_hash_proposal_fee);
            expected_data.proposal_fee_address = new boasdk.PublicKey(proposal.proposal_fee_address);
        }
        return expected_data;
    }
};
