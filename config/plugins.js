
module.exports = ({ env }) => ({
    upload: {
        provider: 'aws-s3',
        providerOptions: {
            accessKeyId: env('AWS_S3_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_S3_SECRET_ACCESS_KEY'),
            region: env('AWS_S3_REGION', 'ap-northeast-2'),
            params: {
                Bucket: env('AWS_S3_BUCKET', 'com.kosac.defora.beta.upload-image'),
            },
        },
    },
    graphql: {
        apolloServer: {
            plugins: []
        }
    },
});

