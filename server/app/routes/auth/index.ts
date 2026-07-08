import express from 'express';
import {signUpUser} from './signUp';
import jwt from "jsonwebtoken";
import { otpLimit } from '../../../rateLimit';
import {findUserExistByEmail} from './fetchUserByEmail';
import sendConfirmationEmail from '../../email/confirm';
import { createOTP, verifyOTP } from '../../middleware/tokens/otp';
import { generateAccessToken, verifyGoogleToken, verifyAppleToken } from '@/middleware/tokens/token';
import getUser from '../user/getUser';
import { embedUser } from '@/services/ml';
import sendWelcomeEmail from '../../email/welcome';

const auth_router = express.Router();

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET not set in environment");

auth_router.get('/findUser/:email', async (req, res) => {
    
    const email = req.params.email as string;

    if (!email) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    const user = await findUserExistByEmail(decodeURIComponent(email));

    if (!user) {
        return res.status(404).json({ exists: false });
    }

    return res.status(200).json({ exists: true, sub: user.sub, firstName: user.firstName, lastName: user.lastName });
});

auth_router.post('/send-code/', otpLimit, async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    // review bypass
    if (email.toLowerCase() === "review@gomeal.org") {
        return res.status(200).json({
            sent: true,
            session_id: "review-session"
        });
    }

    try {
        const { code, session_id } = await createOTP(email);

        await sendConfirmationEmail(email, code);

        return res.status(200).json({ sent: true, session_id });

    } catch (err: any) {

        if (err.message === "cool_down_active"){
            return res.status(429).json({error: "cool_down_active_retry"})
        }

        return res.status(500).json({ error: 'failed_to_send_email' });

    }
});

auth_router.post('/verify-code', otpLimit, async (req, res) => {

    const { email, sub, code, session_id } = req.body;

    if (!email || !code || !session_id) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    const valid = await verifyOTP(email, code, session_id);
    
    if (!valid) {
        return res.status(400).json({ error: 'invalid_or_expired_code' });
    }

    const verified = await getUser(sub);

    return res.status(200).json({ verified: true, user: verified?.user, accessToken: verified?.accessToken, refreshToken: verified?.refreshToken });

});

auth_router.post('/sign-up', async (req, res) => {

    const { email, dob, avatar, firstName, lastName, profile_name } = req.body;

    if (!email || !avatar || !firstName || !lastName || !profile_name){
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const { sub } = await signUpUser({ firstName, lastName, email, dob, profile_name, avatar });

        if (!sub) {
            return res.status(500).json({ error: 'failed_to_create_user' });
        }
        const verified = await getUser(sub);

        sendWelcomeEmail(email, firstName)
            .catch((err) => console.error(`welcome_email_failed_${sub}`, err.message));

        embedUser(sub).catch((err) => console.error(`embed_failed_${sub}`, err.message));

        return res.status(200).json({
            success: true,
            user: verified?.user,
            accessToken: verified?.accessToken,
            refreshToken: verified?.refreshToken,
        });

    } catch (err) {
        console.error(err);                
        return res.status(500).json({ error: 'internal_server_error' });
    }
});

auth_router.post('/refresh', async (req, res) => {

    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'missing_refresh_token' });
    }

    try {

        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { sub: string; email: string };

        const accessToken = generateAccessToken({ sub: decoded.sub, email: decoded.email });

        return res.status(200).json({ accessToken });

    } catch (err) {
        return res.status(401).json({ error: 'invalid_or_expired_refresh_token' });
    }
});

auth_router.post('/social-sign-up', async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const googleUser = await verifyGoogleToken(idToken);

        if (!googleUser?.email) {
            return res.status(401).json({ error: 'invalid_google_token' });
        }

        const existingUser = await findUserExistByEmail(googleUser.email);

        if (existingUser?.sub) {
            const verified = await getUser(existingUser.sub);

            return res.status(200).json({
                exists: true,
                user: verified?.user,
                accessToken: verified?.accessToken,
                refreshToken: verified?.refreshToken,
            });
        }

        return res.status(200).json({
            exists: false,
            googleUser: {
                email: googleUser.email,
                firstName: googleUser.firstName,
                lastName: googleUser.lastName,
                avatar: googleUser.picture,
            },
        });

    } catch (err) {
        console.error(err);
        return res.status(401).json({ error: 'invalid_google_token' });
    }
});

auth_router.post('/apple-sign-up', async (req, res) => {
    const { identityToken, fullName } = req.body;

    if (!identityToken) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const appleUser = await verifyAppleToken(identityToken, fullName);

        if (!appleUser?.email) {
            return res.status(401).json({ error: 'invalid_apple_token' });
        }

        const existingUser = await findUserExistByEmail(appleUser.email);

        if (existingUser?.sub) {
            const verified = await getUser(existingUser.sub);

            return res.status(200).json({
                exists: true,
                user: verified?.user,
                accessToken: verified?.accessToken,
                refreshToken: verified?.refreshToken,
            });
        }

        return res.status(200).json({
            exists: false,
            appleUser: {
                email: appleUser.email,
                firstName: appleUser.firstName,
                lastName: appleUser.lastName,
            },
        });

    } catch (err) {
        console.error(err);
        return res.status(401).json({ error: 'invalid_apple_token' });
    }
});

export default auth_router;