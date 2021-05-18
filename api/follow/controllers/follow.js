'use strict';
const { Expo } = require('expo-server-sdk');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    /**
     * 특정 Group, Activity 를 구독합니다.
     * Action List 
     * * Workspace Create / Join
     * * Group Create / Join
     * * Activity Create / Join
     * @param {*} ctx 
     */
    async createFollow ({request}) {
        const {member, target, isActive, push} = request.body;
        if (target === 'appAll') {
            const foundFollow = await strapi.services.follow.findOne({member, target});
            if (foundFollow !== null && foundFollow !== undefined) {
                const newPush = await strapi.services.push.findOne({id: push});
                await strapi.services.push.update({id: foundFollow.push.id}, {token: newPush.token});
                return await strapi.services.follow.update({id: foundFollow.id}, {push});
            }
        }
        return await strapi.services.follow.create({
            member: member, 
            target: target, 
            isActive: isActive,
            push: push
        });
        
    },
    async updateTargetsFollow ({ request }) {
        const {member, targets, push, isActive} = request.body.input; 

        if (member) {
            let foundFollows = [];
            for (const target of targets) {
                const foundFollow = await strapi.services.follow.findOne({member, target});
                foundFollows.push(foundFollow);
            }
            const result = await Promise.all(
                foundFollows.map((follow) => {
                    return strapi.services.follow.update({ id: follow.id }, {push, isFeedActive: isActive});
                })
            );
            if (result.length === foundFollows.length) {
                return { result: true };
            }
        }
        return { result: false };
    },
    /**
     * 알람수신 상태에 대해 follow 를 활성화/비활성화 합니다.
     * 
     * @param {*} ctx 
     */
    async toggleFollowAll ({ request }) {
        const {member, isActive} = request.body.input; 
        if (member) {
            const foundFollows = await strapi.services.follow.find({member});
            const result = await Promise.all(
                foundFollows.map((follow) => {
                    return strapi.services.follow.update({ id: follow.id }, {isActive});
                })
            );
            if (result.length === foundFollows.length) {
                return { result: true };
            }
        }
        return { result: false };
    }
};


/**
 * FIXME: 테스트 용
 */
const sendPushToUser = () => {
    let expo = new Expo();

    let messages = [];
    const somePushTokens = ['ExponentPushToken[iHBOCgN6qgiDsuARS2dQdr]']
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
            body: 'This is a test notification',
            data: { withSome: 'data' },
        })
    }


    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
    // Send the chunks to the Expo push notification service. There are
    // different strategies you could use. A simple one is to send one chunk at a
    // time, which nicely spreads the load out over time:
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log("🚀 ~ ticketChunk", ticketChunk)
                tickets.push(...ticketChunk);
                // NOTE: If a ticket contains an error code in ticket.details.error, you
                // must handle it appropriately. The error codes are listed in the Expo
                // documentation:
                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
            } catch (error) {
                console.error(error);
            }
        }
    })();


    /** 
     * 나중에 Expo 푸시 알림 서비스가 알림을 Apple 또는 Google에 전달한 후 
     * (보통 빠르게하지만로드시 최대 30 분까지 허용) 
     * 각 알림에 대한 "영수증"이 생성됩니다. 영수증은 최소 하루 동안 사용할 수 있습니다. 
     * 오래된 영수증이 삭제됩니다.
     * 각 영수증의 ID는 각 알림에 대한 응답 "티켓"으로 다시 전송됩니다. 
     * 요약하면 알림을 보내면 나중에 영수증을 받기 위해 사용하는 영수증 ID가 포함 된 티켓이 생성됩니다.
     * 영수증에는 응답해야하는 오류 코드가 포함될 수 있습니다. 
     * 특히 Apple 또는 Google은 알림을 차단했거나 앱을 제거한 기기에 계속 알림을 보내는 앱을 차단할 수 있습니다. 
     * Expo는이 정책을 통제하지 않으며 적절하게 처리 할 수 있도록 Apple과 Google에서 피드백을 보냅니다. 
     * */

    let receiptIds = [];
    for (let ticket of tickets) {
        // NOTE: Not all tickets have IDs; for example, tickets for notifications
        // that could not be enqueued will have error information and no receipt ID.
        if (ticket.id) {
            receiptIds.push(ticket.id);
        }
    }

    let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    (async () => {
        // Like sending notifications, there are different strategies you could use
        // to retrieve batches of receipts from the Expo service.
        for (let chunk of receiptIdChunks) {
            try {
                let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                console.log("🚀 ~ receipts", receipts)

                // The receipts specify whether Apple or Google successfully received the
                // notification and information about an error, if one occurred.
                for (let receiptId in receipts) {
                    let { status, message, details } = receipts[receiptId];
                    if (status === 'ok') {
                        continue;
                    } else if (status === 'error') {
                        console.error(
                            `There was an error sending a notification: ${message}`
                        );
                        if (details && details.error) {
                            // The error codes are listed in the Expo documentation:
                            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                            // You must handle the errors appropriately.
                            console.error(`The error code is ${details.error}`);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }
    })();

}