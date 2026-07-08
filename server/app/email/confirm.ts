import ses from '@/services/ses';
import fs from 'fs';
import path from 'path';
import { SendEmailCommand } from '@aws-sdk/client-ses';

const confirm_html = fs.readFileSync(
    path.join(__dirname, 'confirm.html'),
    'utf-8'
);

const sendConfirmationEmail = async (toEmail: string, code: string) => {
    const html = confirm_html
        .replace('{{code}}', code);

    const command = new SendEmailCommand({
        Source: process.env.EMAIL,
        Destination: {
            ToAddresses: [toEmail],
        },
        Message: {
            Subject: {
                Data: 'Confirm your email',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: html,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: `Your verification code: ${code}. Expires in 10 minutes.`,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    await ses.send(command);
};

export default sendConfirmationEmail;
