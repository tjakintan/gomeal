const { SESClient } = require('@aws-sdk/client-ses');
const dotenv = require('dotenv');
dotenv.config();

const ses = new SESClient({
    
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

export default ses;