import ses from '@/services/ses';
import fs from 'fs';
import path from 'path';
import { SendEmailCommand } from '@aws-sdk/client-ses';

const newsletter_html = fs.readFileSync(
    path.join(__dirname, 'newsLetter.html'),
    'utf-8'
);

const sendNewsletterEmail = async (toEmail: string, name?: string) => {
    const html = newsletter_html
        .replace('{{name}}', name ? ` ${name}` : '');

    const command = new SendEmailCommand({
        Source: process.env.EMAIL,
        Destination: {
            ToAddresses: [toEmail],
        },
        Message: {
            Subject: {
                Data: 'This Week on GoMeal',
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: html,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: `This Week on GoMeal${name ? `, ${name}` : ''}\nHere is what is cooking this week on GoMeal.\n\n- New recipes are waiting for you.\n- Share a meal or cooking video this week.\n- See what the GoMeal community is making.\n\nhttps://app.gomeal.org/open`,
                    Charset: 'UTF-8',
                },
            },
        },
    });

    await ses.send(command);
};

export default sendNewsletterEmail;
