const boasdk = require('boa-sdk-ts');

const default_app_name = 'Votera';

function makeQrcodeLogin(seed) {
    const validator_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey(seed));
    // const temporary_key = boasdk.KeyPair.random();
    const temporary_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey('SAFRBTFVAB37EEJDIUGCDK5R3KSL3QDBO3SPS6GX752IILWB4NGQY7KJ'));
    const expires = new Date(Date.now() + 24 * 3600 * 1000);
    const voter_card = new boasdk.VoterCard(
        validator_key.address,
        temporary_key.address,
        expires.toISOString(),
    );
    voter_card.signature = validator_key.sign(voter_card);

    const voterLogin = {
        private_key: temporary_key.secret.toString(false),
        voter_card: {
            validator: validator_key.address.toString(),
            address: temporary_key.address.toString(),
            expires: expires.toISOString(),
            signature: voter_card.signature.toString(),
        },
    };

    return voterLogin;
}

const maxHeight = 100;

function getPreimageAt(basis_preimage, height) {
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

function makeQrcodeVote(seed, preimage, height) {
    const app_name = default_app_name;
    const pre_image = getPreimageAt(preimage, height);
    const key_agora_admin = boasdk.hashMulti(new boasdk.Hash(pre_image).data, Buffer.from(app_name));

    const validator_key = boasdk.KeyPair.fromSeed(new boasdk.SecretKey(seed));
    const encryptionKey = new boasdk.EncryptionKey(
        app_name,
        new boasdk.Height(height),
        key_agora_admin, validator_key.address);
    encryptionKey.signature = validator_key.sign(encryptionKey);

    const voterCard = {
        app: app_name,
        height: height.toString(),
        value: key_agora_admin.toString(),
        validator: validator_key.address.toString(),
        signature: encryptionKey.signature.toString(),
    };

    return voterCard;
}

module.exports = {
    makeQrcodeLogin,
    makeQrcodeVote,
};
