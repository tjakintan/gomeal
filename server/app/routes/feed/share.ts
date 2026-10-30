import express from "express";
import fs from "fs";
import path from "path";
import sharp, { OverlayOptions } from "sharp";
import { spawn } from "child_process";
import { get_post_by_id, getFeedActionCounts } from "./actions";

export const share_router = express.Router();

export const SHARE_BASE =
    process.env.DEV === "true"
        ? "http://192.168.1.10:3000/share"
        : "https://app.gomeal.org/share";

const APPLE_APP_STORE_ID = process.env.APPLE_APP_STORE_ID;

const share_html = fs.readFileSync(path.join(__dirname, "../../html/share.html"), "utf-8");

const escapeHtml = (value: string = "") =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const getVideoThumbnail = (url: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const args = [
            "-hide_banner",
            "-loglevel", "error",
            "-ss", "1",
            "-i", url,
            "-map", "0:v:0",
            "-frames:v", "1",
            "-vf", "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630",
            "-f", "image2pipe",
            "-vcodec", "png",
            "pipe:1",
        ];

        const ffmpeg = spawn("ffmpeg", args, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        const chunks: Buffer[] = [];
        let stderr = "";

        ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
        ffmpeg.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });

        const timeout = setTimeout(() => {
            ffmpeg.kill("SIGKILL");
        }, 30_000);

        ffmpeg.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        ffmpeg.on("close", (code) => {
            clearTimeout(timeout);

            const output = Buffer.concat(chunks);

            if (code === 0 && output.length > 0) {
                resolve(output);
            } else {
                reject(new Error(`FFmpeg thumbnail failed: ${stderr}`));
            }
        });
    });
};

const getShareThumbnail = async (
    image_url: string,
    media_type: string
): Promise<Buffer> => {
    if (media_type === "video") {
        return getVideoThumbnail(image_url);
    }

    const response = await fetch(image_url);

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
};

const fetchBuf = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
};

share_router.get("/share/:post_id", async (req, res) => {
    try {
        const post_id = Number(req.params.post_id);
        if (!Number.isInteger(post_id)) return res.status(400).send("invalid_post_id");

        const post = await get_post_by_id(post_id);
        if (!post) return res.status(404).send("post_not_found");

        const counts = await getFeedActionCounts(post_id);

        const user_circle = post.profile_img_url
            ? `<img class="user-circle" src="${escapeHtml(post.profile_img_url)}" alt="${escapeHtml(post.profile_name ?? "")}" />`
            : `<div class="user-circle fallback">${escapeHtml((post.profile_name ?? "?").charAt(0).toUpperCase())}</div>`;

        const html = share_html
            .replaceAll("{{title}}", escapeHtml(post.dish_name))
            .replaceAll("{{description}}", escapeHtml(`${post.description ?? ""} · by ${post.profile_name}`))
            .replaceAll("{{profile_name}}", escapeHtml(post.profile_name ?? "Someone"))
            .replaceAll(
                "{{post_image}}",
                escapeHtml(
                    post.media_type === "video"
                        ? `${SHARE_BASE}/${post.post_id}/thumbnail.png`
                        : post.image_url
                )
            )  
            .replaceAll("{{likes}}", String(counts.post_love))
            .replaceAll("{{cooks}}", String(counts.post_cook))
            .replaceAll("{{user_circle}}", user_circle)
            .replaceAll("{{url}}", escapeHtml(`${SHARE_BASE}/${post.post_id}`))
            .replaceAll("{{post_id}}", String(post.post_id))
            .replaceAll("{{app_store_id}}", String(APPLE_APP_STORE_ID));

        return res.status(200).type("html").send(html);
    } catch (err) {
        console.error(err);
        return res.status(500).send("failed_to_generate_share_page");
    }
});

// Dynamic 1200x630 preview image: food photo + bottom bar with counts + profile circle on the right
share_router.get("/share/:post_id/og.png", async (req, res) => {
    try {
        const post_id = Number(req.params.post_id);
        if (!Number.isInteger(post_id)) return res.status(400).send("invalid_post_id");

        const post = await get_post_by_id(post_id);
        if (!post) return res.status(404).send("post_not_found");

        const counts = await getFeedActionCounts(post_id);

        const W = 1200, H = 630, BAR = 170, R = 56;

        const thumbnail = await getShareThumbnail(
            post.image_url,
            post.media_type
        );

        const base = await sharp(thumbnail)
            .resize(W, H, { fit: "cover" })
            .toBuffer();

        const bar = Buffer.from(`
            <svg width="${W}" height="${BAR}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${W}" height="${BAR}" fill="#6f9b91"/>
                <text x="40" y="70" font-size="44" font-weight="700" fill="#fff" font-family="sans-serif">${escapeHtml(post.dish_name.slice(0, 32))}</text>
                <text x="40" y="130" font-size="34" fill="#fff" font-family="sans-serif">❤️ ${counts.post_love}     🍳 ${counts.post_cook}</text>
            </svg>`);

        const composites: OverlayOptions[] = [{ input: bar, top: H - BAR, left: 0 }];

        if (post.profile_img_url) {
            const mask = Buffer.from(`<svg width="${R * 2}" height="${R * 2}"><circle cx="${R}" cy="${R}" r="${R}" fill="#fff"/></svg>`);
            const circle = await sharp(await fetchBuf(post.profile_img_url))
                .resize(R * 2, R * 2, { fit: "cover" })
                .composite([{ input: mask, blend: "dest-in" }])
                .png()
                .toBuffer();
            composites.push({ input: circle, top: H - BAR + (BAR - R * 2) / 2, left: W - R * 2 - 40 });
        }

        const png = await sharp(base).composite(composites).png().toBuffer();

        res.set("Cache-Control", "public, max-age=3600").type("png").send(png);
    } catch (err) {
        console.error(err);
        res.status(500).send("failed_to_generate_og_image");
    }
});

share_router.get("/share/:post_id/thumbnail.png", async (req, res) => {
    try {
        const post_id = Number(req.params.post_id);

        if (!Number.isInteger(post_id)) {
            return res.status(400).send("invalid_post_id");
        }

        const post = await get_post_by_id(post_id);

        if (!post) {
            return res.status(404).send("post_not_found");
        }

        if (post.media_type !== "video") {
            return res.status(400).send("post_is_not_a_video");
        }

        const thumbnail = await getVideoThumbnail(post.image_url);

        return res
            .set({
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=3600",
            })
            .send(thumbnail);
    } catch (err) {
        console.error("[SHARE THUMBNAIL ERROR]", err);
        return res.status(500).send("failed_to_generate_thumbnail");
    }
});