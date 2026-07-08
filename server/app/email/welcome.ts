import ses from '@/services/ses';
import fs from 'fs';
import path from 'path';
import { SendEmailCommand } from '@aws-sdk/client-ses';

const welcome_html = fs.readFileSync(
    path.join(__dirname, 'welcome.html'),
    'utf-8'
);

const sendWelcomeEmail = async (toEmail: string, name?: string) => {
    const html = welcome_html
        .replace('{{name}}', name ? `, ${name}` : '');

    const command = new SendEmailCommand({
        Source: process.env.EMAIL,
        Destination: {
            ToAddresses: [toEmail],
        },
        Message: {
            Subject: {
                Data: 'Welcome to GoMeal',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: html,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: `Welcome${name ? `, ${name}` : ''}!\nThanks for joining GoMeal.\nhttps://app.gomeal.org/open`,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    await ses.send(command);
};

export default sendWelcomeEmail;