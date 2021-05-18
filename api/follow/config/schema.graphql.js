'use strict';

module.exports = {
    definition: `
        input updateTargetsFollowInput {
            member: String
            targets: [String]
            push: String
            isActive: Boolean
        }
        type updateTargetsFollowPayload {
            result: Boolean
        }
        input toggleFollowAllInput {
            member: String
            isActive: Boolean
        }
        type toggleFollowAllPayload {
            result: Boolean
        }
    `,
    mutation: `
        updateTargetsFollow(input: updateTargetsFollowInput): updateTargetsFollowPayload
        toggleFollowAll(input: toggleFollowAllInput): toggleFollowAllPayload
    `,
    resolver: {
        Mutation: {
            createFollow: {
                description: 'Link Follow between Member with Target(Workspace, Group, Activity)',
                resolverOf: 'application::follow.follow.create',
                resolver: 'application::follow.follow.createFollow'
            },
            updateFollow: {
                description: 'Update isActive field in Follow Documents',
                resolverOf: 'application::follow.follow.update',
                resolver: 'application::follow.follow.toggleFollowAll'
            },
            updateTargetsFollow: {
                description: 'Update isActive, push field in Follow Documents',
                resolverOf: 'application::follow.follow.updateTargetsFollow',
                resolver: 'application::follow.follow.updateTargetsFollow'
            },
            toggleFollowAll: {
                description: 'Update isActive field in Follow Documents',
                resolverOf: 'application::follow.follow.update',
                resolver: 'application::follow.follow.toggleFollowAll'
            }
        }
    }
}