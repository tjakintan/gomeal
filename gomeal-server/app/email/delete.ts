import ses from "@/services/ses";
import fs from "fs";
import path from "path";

import { SendEmailCommand } from "@aws-sdk/client-ses";

const delete_html = fs.readFileSync(
    path.join(__dirname, "delete.html"),
    "utf-8"
);

const sendDeleteAccountEmail = async (
    toEmail: string
) => {

    const command = new SendEmailCommand({
        Source: process.env.EMAIL,

        Destination: {
            ToAddresses: [toEmail],
        },

        Message: {

            Subject: {
                Data: "Your GoMeal account has been deleted",
                Charset: "UTF-8",
            },

            Body: {

                Html: {
                    Data: delete_html,
                    Charset: "UTF-8",
                },

                Text: {
                    Data:
                        "Your GoMeal account has been scheduled for deletion. Data may be retained for up to 30 days in accordance with our Privacy Policy.",
                    Charset: "UTF-8",
                },

            },

        },

    });

    await ses.send(command);
};

export default sendDeleteAccountEmail;