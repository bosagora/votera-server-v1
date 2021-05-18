const mongoose = require('mongoose');
const _ = require('lodash');
const { ApolloError } = require('apollo-server-express');

const Activity = mongoose.model('activity');
// const ActivityGroup = mongoose.model('activityGroup');
// const GENESIS = require('../config/json/genesisConfig');
const feed = require('./feedUtils');
const log = require('../config/logger');
const audit = require('../utils/audit');
const elasticsearch = require('../utils/elasticsearchUtil');

const SYSTEM = 'SYSTEM';
const ELASTICSEARCH_ENDPOINT_FOR_ACTIVITY = '/activities/activity';

const exception = require('../models/exception/deforaException');
const serverException = exception.getDeforaException();

module.exports = async function () {
    const CLOSED = 'CLOSED';
    const genesisAddress = GENESIS.genesisAddress;

    //strapi의 activity 중 deadline이 도달한 것을 찾음
    const pastActivities = await Activity.find({
        deadline: { $gte: 1, $lte: Date.now() },
        $or: [{ status: 'NEW' }, { status: 'OPEN' }]
    })
        .populate('activityGroup')
        .populate('discussion')
        .populate({
            path: 'discussion', populate: {
                path: 'opinions'
            }
        })
        .populate({
            path: 'discussion', populate: {
                path: 'opinions', populate: {
                    path: 'likes'
                }
            }
        })
        .populate({
            path: 'discussion', populate: {
                path: 'opinions', populate: {
                    path: 'writer'
                }
            }
        })
        .populate('participants')
        .then((res) => {
            return res;
        }).catch(err => {
            log.error(audit({
                code: '60000',
                error: 'NOT_FOUND',
                message: 'There was a problem calling Past Activities. : ' + err
            }))
        });

    // todo 총액 -> 체크 mongo bulk write method

    // 마감기한이 지나고, status가 NEW, OPEN인 activities 를 map 돌립낟.
    await pastActivities.map(async activity => {
        activity.status = CLOSED;
        activity.save();

        const activityType = activity.activityType;
        const totalReward = activity.point;

        let pastActivityGroup = activity.activityGroup;
        pastActivityGroup.status = CLOSED;
        pastActivityGroup.realTotalTrendingScore = 0;
        pastActivityGroup.save();

        if (pastActivityGroup.groupType && pastActivityGroup.groupType.toUpperCase() === 'PUBLIC') {
            let requestES = {};
            requestES.fields = ['status', 'realTotalTrendingScore'];
            requestES.endpoint = ELASTICSEARCH_ENDPOINT_FOR_ACTIVITY;

            await elasticsearch.update(pastActivityGroup, requestES);
        }


        //point에 관련된 feed 처리 
        await feed.sendFeed({
            type: 'activity',
            id: pastActivityGroup.activityId,

            actor: 'SYSTEM',
            feedComment: 'closeActivity',

            activityId: pastActivityGroup.activityId,
            activityTitle: pastActivityGroup.title,
            activityType: pastActivityGroup.activityType,
            groupId: pastActivityGroup.groupId,
            groupTitle: pastActivityGroup.groupTitle,
            groupImage: pastActivityGroup.groupImage,
            slackApi: pastActivityGroup.slackApi
        })
    });

};
const division = function (first, second) {
    return roundDown(first / second);
};
const roundDown = function (number) {
    return Math.round(number * 10000000) / 10000000;
}
