import express from 'express';
import { add_newsletter_subscriber, remove_newsletter_subscriber, is_newsletter_subscribed } from './newsletter';
import sendNewsletterEmail from '@/email/newsLetter';

const web_router = express.Router();

web_router.post('/newsletter/subscribe', async (req, res) => {
    const { email, source, topic } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const subscribed = await add_newsletter_subscriber(email, { source, topic });

        if (subscribed) {
            await sendNewsletterEmail(email);
        }

        return res.status(200).json({ subscribed });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'internal_server_error' });
    }
});

web_router.post('/newsletter/unsubscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const unsubscribed = await remove_newsletter_subscriber(email);

        if (!unsubscribed) {
            return res.status(404).json({ error: 'subscriber_not_found' });
        }

        return res.status(200).json({ unsubscribed });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'internal_server_error' });
    }
});

web_router.get('/newsletter/status/:email', async (req, res) => {
    const email = req.params.email as string;

    if (!email) {
        return res.status(400).json({ error: 'request_failed_missing_body' });
    }

    try {
        const subscribed = await is_newsletter_subscribed(decodeURIComponent(email));

        return res.status(200).json({ subscribed });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'internal_server_error' });
    }
});

export default web_router;