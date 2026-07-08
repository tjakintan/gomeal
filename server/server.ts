import express from 'express';
import cors from 'cors';
import http from "http";
import { useRouter, useSocket } from './app/routes/index';
import { initSocket } from './app/services/socket';
import { cleanup_notification } from './app/routes/user/notification';
import { send_push_noti_cooking_reminder } from './app/jobs/noti';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/', useRouter);
app.get('/health', (req, res) => res.status(200).send('ok'));

const server = http.createServer(app);
const io = initSocket(server);

useSocket(io);

server.listen(PORT, () => {
  console.log(`server_running_on_port:${PORT}`);
  console.log(`DEV value:${process.env.DEV}`);
});

cleanup_notification();
send_push_noti_cooking_reminder();