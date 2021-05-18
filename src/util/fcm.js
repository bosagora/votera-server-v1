const admin = require("firebase-admin");

const serviceAccount = require("../../votera-2c754-firebase-adminsdk-t537z-57d93ce781.json");
// const PROJECT_ID = serviceAccount.project_id;
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://votera-2c754.firebaseio.com"
  });
console.log(admin.app().name);  // '[DEFAULT]'


function chunkify(iterable, size) {
	const chunks = [];
	for (let i = 0, j = iterable.length; i < j; i += size) {
		chunks.push(iterable.slice(i, i + size))
	}
	return chunks;
}

const getMessageSet = (payload) => {
    const { type, content } = payload;

    let title;
    let body;
    switch (type) {
        // case 'ASSESS_24HR_DEADLINE':
        // case 'ASSESS_CLOSED':
        // case 'VOTING_24HR_DEADLINE':
        case 'VOTING_START':
            title = '투표 시작';
            body = `${content.proposalTitle} 의 투표가 시작되었으니 투표에 참여해보세요. `;
            break;
        case 'VOTING_CLOSED':
            title = '투표 종료';
            body = `${content.proposalTitle} 투표가 종료되었습니다. 결과를 확인해보세요. `;
            break;
        case 'NEW_PROPOSAL_NOTICE':
            title = '제안 공지 등록';
            body = `${content.proposalTitle} 에 새로운 공지가 등록되었습니다. 확인해보세요. `;
            break;
        case 'NEW_OPINION_COMMENT':
            title = '의견에 답글 달림'
            body = `${content.userName} 님이 당신의 의견에 댓글을 남겼습니다💬`;
            break;
        case 'NEW_OPINION_LIKE':
            title = '좋아요 받음'
            body = `${content.userName} 님이 당신의 의견을 추천했습니다`;
            break;
        case 'NEW_PROPOSAL':
            title = '새로운 제안이 만들어졌어요!'
            body = `${content.proposalTitle} 이 등록되었으니 확인해 보세요.`;
            break;
        default:
            console.log('no push type');
            break;
    }

    return { title, body }
}

module.exports = {
    setMulticastMessages: async function(payload, targets) {
        const registrationTokens = targets;
        const chuckedRegistrationTokens = chunkify(registrationTokens, 500);
        const messageSet = getMessageSet(payload);

        const messages = chuckedRegistrationTokens.map(tokens => { 
            return {
                notification: {
                    title: messageSet.title,
                    body: messageSet.body
                },
                tokens
            }
        });

        return messages;
    },
    sendToDevices: async function(message) {
        admin.messaging()
            .sendMulticast(message)
            .then(response => {
                console.log('Notification sent successfully: ', response);
            })
            .catch(error =>
                console.log('Notification sent failed:', error)
            )
    },

    sendToTopic: async function (message) {
        admin.messaging().send(message)
            .then((response) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });

    },

    subscribe: async function (registrationTokens, topic) {
        admin.messaging().subscribeToTopic(registrationTokens, topic)
            .then(function(response) {
                // See the MessagingTopicManagementResponse reference documentation
                // for the contents of response.
                console.log('Successfully subscribed to topic:', response);
            })
            .catch(function(error) {
                console.log('Error subscribing to topic:', error);
            });
    },

    unsubscribe: async function (registrationTokens, topic) {
        admin.messaging().unsubscribeFromTopic(registrationTokens, topic)
            .then(function(response) {
                // See the MessagingTopicManagementResponse reference documentation
                // for the contents of response.
                console.log('Successfully unsubscribed to topic:', response);
            })
            .catch(function(error) {
                console.log('Error subscribing to topic:', error);
            });
    }

}
