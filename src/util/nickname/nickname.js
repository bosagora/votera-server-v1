const BN = require('bn.js');
const nicknameConfig = require('./nicknameConfig.json');

const firstNames = nicknameConfig.first;
const secondNames = nicknameConfig.second;
const base = nicknameConfig.base;

const nickPrime = new BN(getNicknamePrime(firstNames.length * secondNames.length));
const nickBase = nickPrime.subn(2);
const nickPn = BN.mont(nickPrime);


module.exports = function(params) {
    let {
        participantsLength, joinId
    } = params;
    joinId = joinId.toString();

    let offset = 0;
    const joinIdNum = parseInt(joinId, 16);
    const joinBase = new BN(base[joinIdNum % base.length]);

    let pn = new BN(participantsLength).divmod(nickBase);
    let target = joinBase.toRed(nickPn).redPow(pn.mod.iaddn(1)).fromRed().toNumber();
    let firstIndex = (target + offset) % firstNames.length;
    let secondIndex = (Math.trunc(target / firstNames.length) + offset) % secondNames.length;
    let targetIndex = pn.div.toNumber();

    return (targetIndex > 0) ? createName(firstIndex, secondIndex, targetIndex) : createName(firstIndex, secondIndex);
}

const createName = function(firstIndex, secondIndex, targetIndex) {
    let nickname = firstNames[firstIndex] + ' ' + secondNames[secondIndex];

    if(targetIndex) nickname = nickname + ' ' + targetIndex;

    return nickname;
}

function getNicknamePrime(nickSize) {
    let checkNum = nickSize - 1;
    while(checkNum > 2) {
        if (checkNum % 2 === 0) {
            checkNum--;
        }
        let loopMax = Math.trunc(Math.sqrt(checkNum));
        let foundDivisor = false;

        for (let i = 3; i <= loopMax; i += 2) {
            if (checkNum % i === 0) {
                foundDivisor = true;
                break;
            }
        }
        if (!foundDivisor) {
            return checkNum;
        }

    checkNum--;
    }
    return checkNum;
}
