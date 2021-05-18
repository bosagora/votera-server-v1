'use strict'
const { Expo } = require('expo-server-sdk');

/**
 * @writer Sangwon Park
 * 
 * 호출 순서
 * 
 * setMessage() or setMessages()
 * -> sendPushNotifications()
 */

const getMessageSet = (payload) => {
    const { type, content } = payload;

    let title;
    let body;
    switch (type) {
        // case 'ASSESS_24HR_DEADLINE':
        // case 'ASSESS_CLOSED':
        // case 'VOTING_START':
        // case 'VOTING_24HR_DEADLINE':
        // case 'VOTING_CLOSED':
        // case 'NEW_PROPOSAL_NOTICE':
        // case 'NEW_OPINION_COMMENT':
        // case 'NEW_OPINION_LIKE':
        case 'GROUP_NEW_ACTIVITY':
            title = '새로운 액티비티가 만들어졌어요!'
            body = `${content.userName} 님이 ${content.groupName} 에 ${content.activityName} 를 만들었어요.`;
            break;
        /**
         * TODO: 다른 타입의 메세지 추가
         * 한, 영 분기 어떻게...
         * */
        default:
            console.log('no push type');
            break;
    }

    return { title, body }
}

module.exports = {
    /**
     * Push Notification 의 메세지 데이터를 정의합니다.
     * 다수의 인원에게 동일한 body를 생성합니다.
     * 성능상 payload 가 동일한 target에 효율적임
     * @param {*} somePushTokens 송신 단말기 토큰 목록
     * @param {*} payload 푸시알람 데이터 (Feed Payload)
     */
    setMessage: (somePushTokens, payload) => {
        const messageSet = getMessageSet(payload);
        const message = {
            to: somePushTokens,
            sound: 'default',
            title: messageSet.title,
            body: messageSet.body,
            data: {},
        };
        return [message];
    },

    /**
     * Push Notification 의 메세지 데이터를 정의합니다.
     * 다수의 인원에게 다른 body를 생성합니다.
     * * 아직 사용하지 않음, 필요시 구현 가능
     * @param {*} somePushTokens 송신 단말기 토큰 목록
     * @param {*} payload 푸시알람 데이터 (Feed Payload)
     */
    setMessages: async (somePushTokens, payload) => {
        const { } = payload;
        let messages = [];
        for (let pushToken of somePushTokens) {
            // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

            // Check that all your push tokens appear to be valid Expo push tokens
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
            messages.push({
                to: pushToken, // FIXME: We recommend using an array when you want to send multiple messages to efficiently minimize the number of requests you need to make to Expo servers.  
                sound: 'default',
                body: '',
                data: {},
            })
        }

        return messages;
    },


    /**
     * Expo push notification service 에 message 청크를 보냅니다.
     * 
     * @param {*} messages 
     */
    sendPushNotifications: (messages) => {
        let expo = new Expo();
        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];
        (async () => {
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log("🚀 ~ ticketChunk", ticketChunk)
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error(error);
                }
            }
        })();
    }

}