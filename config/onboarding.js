module.exports = ({ env }) => ({
    user: {
        default_role: env('ONBOARDING_DEFAULT_ROLE', 'authenticated'),
    },
});
