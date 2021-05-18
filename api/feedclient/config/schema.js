const { gql } = require('apollo-server-koa');

const Activity = require('./resolvers/activity');

const Subscription = require('./typeDefs/actions/subscription');
const Enum = require('./typeDefs/types/enum');
const Input = require('./typeDefs/types/input');
const Type = require('./typeDefs/types/type');

module.exports = {
    typeDefs: gql`
        ${ Enum }
        ${ Type }
        ${ Input }
        ${ Subscription }
    `,
    resolver: Activity.resolvers
};
