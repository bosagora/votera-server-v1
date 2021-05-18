const SHA3 = require('sha3');

const hashWorkspace = (workspaceKey) => {
    if (!workspaceKey) {
        return workspaceKey;
    }
    const keccak = new SHA3.Keccak(256);
    keccak.update(Buffer.from(workspaceKey, 'utf8'));
    return keccak.digest().toString('base64');
};

const makeSignatureCheck = (signature, address) => {
    const keccak = new SHA3.Keccak(256);
    keccak.update(signature);
    keccak.update(address);
    return keccak.digest('base64');
}

const makeLinkID = (id, email) => {
    const keccak = new SHA3.Keccak(256);
    keccak.update(email, 'utf8');
    const hashed = keccak.digest();

    const idXor = Buffer.from(id, 'utf8');
    const linkId = Buffer.allocUnsafe(4 + idXor.length);

    // 앞의 4 byte 만 XOR 하는데 사용
    for (let i = 0; i < 4; i++) {
        linkId[i] = hashed[i];
    }
    for (let i = 0; i < idXor.length; i++) {
        linkId[i + 4] = hashed[i & 0x03] ^ idXor[i];
    }
    return encodeURIComponent(linkId.toString('base64'));
};

const parseLinkID = (linkId) => {
    const bufLinkId = Buffer.from(decodeURIComponent(linkId), 'base64');
    if (bufLinkId.length <= 4) {
        return '';
    }

    const idXor = Buffer.allocUnsafe(bufLinkId.length - 4);
    for (let i = 0; i < idXor.length; i++) {
        idXor[i] = bufLinkId[i & 0x03] ^ bufLinkId[i + 4];
    }

    return idXor.toString('utf8');
};

const verifyLinkID = (linkId, email) => {
    const bufLinkId = Buffer.from(decodeURIComponent(linkId), 'base64');
    if (bufLinkId.length < 4) {
        return false;
    }

    const keccak = new SHA3.Keccak(256);
    keccak.update(email, 'utf8');
    const hashed = keccak.digest();

    for (let i = 0; i < 4; i++) {
        if (bufLinkId[i] !== hashed[i]) {
            return false;
        }
    }

    return true;
};

module.exports = {
    hashWorkspace,
    makeSignatureCheck,
    makeLinkID,
    parseLinkID,
    verifyLinkID,
};
