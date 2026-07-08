import path from 'path';
import express from 'express';
import auth_router from './auth';
import post_router from './post';
import feed_router from './feed';
import cook_router from './cook';
import web_router from './web';
import { share_router } from './feed/share';
import { Server } from "socket.io";
import { search_router } from './search';
import { feed_sockets } from './feed/index.socket';
import { message_sockets } from './messages/index.socket';
import { user_router, user_sockets } from './user/index.socket';
export const useRouter = express.Router();

useRouter.use('/auth', auth_router); 

useRouter.use('/post', post_router);

useRouter.use('/feed', feed_router);

useRouter.use('/chef', user_router);

useRouter.use('/search', search_router);

useRouter.use('/cook', cook_router);

useRouter.use('/', share_router);

useRouter.use('/web', web_router);

useRouter.get('/open', (req, res) => {

    res.sendFile(
        path.resolve(
            process.cwd(),
            'app',
            'email',
            'open.html'
        )
    );
});

useRouter.get('/.well-known/apple-app-site-association', (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    res.send({
        "applinks": {
            "apps": [],
            "details": [
            {
                "appIDs": ["UGQD4SYSL4.com.gomeal.mobile"],
                "paths": [
                    "/share/*",
                    "/open/*"
                ]
            }
            ]
        }
    });
});

useRouter.get('/.well-known/assetlinks.json', (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    res.send([
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: 'com.gomeal.mobile',
                sha256_cert_fingerprints: [
                    'E7:AC:AB:FB:44:CC:21:33:14:85:C1:90:98:AC:36:C5:19:36:5D:61:C7:59:E7:CA:6C:30:44:96:56:60:6E:A4'
                ]
            }
        }
    ]);
});

export function useSocket(io: Server) {
    feed_sockets(io);
    message_sockets(io);
    user_sockets(io);
};
