'use strict';
const crypto = require('crypto');
const boasdk = require('boa-sdk-ts');
const { exists } = require('fs');

const formatError = (error) => [{ messages: [{ id: error.id, message: error.message, field: error.field }] }];

module.exports = {
    async createUser(username, email, password) {
        if (username !== email) {
            const userWithSameUsername = await strapi.query('user', 'users-permissions').findOne({ username });
            if (userWithSameUsername) {
                throw new Error('Username already taken');
            }
        }
        const userWithSameEmail = await strapi
            .query('user', 'users-permissions')
            .findOne({ email: email.toLowerCase() });
        if (userWithSameEmail) {
            throw new Error('email already taken');
        }

        const user = {
            username,
            email,
            password,
            provider: 'local',
        };
        user.email = user.email.toLowerCase();
        const defaultRole = await strapi
            .query('role', 'users-permissions')
            .findOne({ type: strapi.config.onboarding.user.default_role }, []);
        user.role = defaultRole.id;

        try {
            const data = await strapi.plugins['users-permissions'].services.user.add(user);
            return { user: data, created: true };
        } catch (error) {
            throw new Error(formatError(error));
        }
    },
    async findUniqueUserEmail() {
        while (true) {
            const randEmail = (crypto.randomBytes(16).toString('hex') + '@votera.id').toLowerCase();
            const userWithSameEmail = await strapi.query('user', 'users-permissions').findOne({ email: randEmail });
            if (!userWithSameEmail) {
                return randEmail;
            }
        }
    },
    /**
     * check validity of VoterCard
     * @param {*} voterCard 
     * @returns 
     */
    async getVoterCardFromInput(voterCard) {
        const voter_card = await strapi.services.boaclient.getValidVoterCard(voterCard);
        if (!voter_card) {
            throw new Error('invalid voterCard');
        }

        const expiresIn = new Date(voter_card.expires);
        if (expiresIn.getTime() < Date.now()) {
            throw new Error('expired voterCard');
        }

        return voter_card;
    },
    /**
     * check if voter_card is registered for other
     * @param {*} voter_card 
     * @returns 
     */
    async checkExistVoterCard(voter_card) {
        const address = voter_card.validator_address.toString();

        const existsMember = await strapi.services.member.findOne({ address });
        if (!existsMember) {
            return null;
        }
        if (existsMember.status === 'DELETED') {
            return existsMember;
        }

        const exist_voter_card = await strapi.services.boaclient.getValidVoterCard(existsMember.voterCard);
        if (!exist_voter_card) {
            return existsMember;
        }

        const inputExpiresIn = new Date(voter_card.expires);
        const existExpiresIn = new Date(exist_voter_card.expires);
        if (inputExpiresIn.getTime() <= existExpiresIn.getTime()) {
            throw new Error('already registered voterCard');
        }

        return existsMember;
    },
    /**
     * create new user with voter card
     * @param {*} username 
     * @param {*} password 
     * @param {*} nodeName 
     * @param {*} voterCard 
     * @returns 
     */
    async createValidatorUser(username, password, nodeName, voterCard) {
        const voter_card = await this.getVoterCardFromInput(voterCard);
        const existMember = await this.checkExistVoterCard(voter_card);

        const randEmail = await this.findUniqueUserEmail();
        const result = await this.createUser(username, randEmail, password);

        if (existMember) {
            await strapi.services.member.update({
                id: existMember.id
            }, {
                username: nodeName,
                lastAccessTime: new Date(),
                user: result.user.id,
                voterCard,
                status: 'OPEN'
            });
        } else {
            const member = await strapi.services.member.create({
                username: nodeName,
                address: voter_card.validator_address.toString(),
                lastAccessTime: new Date(),
                user: result.user.id,
                voterCard,
                status: 'OPEN'
            });
        }

        await strapi.plugins['users-permissions'].services.user.edit({ id: result.user.id }, { confirmed: true });
        return await strapi.query('user', 'users-permissions').findOne({ id: result.user.id })
    },
    /**
     * check existence of voter card and recover user
     * @param {*} password 
     * @param {*} voterCard 
     * @returns 
     */
    async recoverValidatorUser(password, voterCard) {
        const voter_card = await this.getVoterCardFromInput(voterCard);
        const member = await this.checkExistVoterCard(voter_card);
        if (!member || member.status === 'DELETED') {
            throw new Error('not found member');
        } else if (!member.user) {
            throw new Error('not found user');
        }

        const user = await strapi.query('user', 'users-permissions').findOne({ id: member.user.id });
        if (!user) {
            throw new Error('not found user');
        }

        await strapi.plugins['users-permissions'].services.user.edit({ id: user.id }, { password });
        return await strapi.query('user', 'users-permissions').findOne({ id: user.id });
    },
    async checkDupUserName(username) {
        const user = await strapi.query('user', 'users-permissions').findOne({ username });
        if (user) {
            return { username, duplicated: true }
        } else {
            return { username, duplicated: false }
        }
    },
    /**
     * get member data and check ownership
     * @param {*} id 
     * @param {*} user 
     * @returns 
     */
    async checkMemberUser(id, user) {
        const member = await strapi.query('member').findOne({ id });
        if (member && member.status === 'DELETED') {
            return { member: null, authorized: false };
        }

        return {
            member,
            authorized: (member && member.user.id === user.id)
        };
    },
    /**
     * check input address and voter_card consistency with exist address
     * @param {*} oldMember 
     * @param {*} newMember 
     */
    async checkUpdateMemberParameter(oldMember, newMember) {
        if (newMember.address) {
            if (oldMember.address !== newMember.address) {
                throw new Error('invalid parameter');
            }
        }
        if (newMember.voterCard) {
            const voter_card = await this.getVoterCardFromInput(newMember.voterCard);
            if (oldMember.address !== voter_card.validator_address.toString()) {
                throw new Error('invalid parameter');
            }
        }
    }
};
