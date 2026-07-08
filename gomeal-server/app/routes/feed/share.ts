import express from "express";
import fs from "fs";
import path from "path";
import { get_post_by_id } from "./actions";

export const share_router = express.Router();

const share_html = fs.readFileSync(
    path.join(__dirname, "share.html"),
    "utf-8"
);

share_router.get('/share/:post_id', async (req, res) => {
    try {
        const post_id = Number(req.params.post_id);
        if (!Number.isInteger(post_id)) return res.status(400).send('invalid_post_id');

        const post = await get_post_by_id(post_id);
        if (!post) return res.status(404).send('post_not_found');

        const escapeHtml = (value: string = "") =>
            value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");

        const html = share_html
            .replaceAll("{{title}}", escapeHtml(post.dish_name))
            .replaceAll("{{description}}", escapeHtml(`${post.dish_name}, ${post.description} by ${post.profile_name}`))
            .replaceAll("{{image}}", escapeHtml(post.image_url))
            .replaceAll("{{url}}", escapeHtml(`https://app.gomeal.org/share/${post.post_id}`))
            .replaceAll("{{post_id}}", String(post.post_id))
            .replaceAll("{{app_store_id}}", "YOUR_APP_STORE_ID");

        return res.status(200).type("html").send(html);

    } catch (err) {
        console.error(err);
        return res.status(500).send('failed_to_generate_share_page');
    }
});