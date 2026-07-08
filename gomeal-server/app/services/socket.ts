import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

let io: Server;

export function initSocket(server: http.Server) {

    io = new Server(server, {
        cors: { 
            origin: "*", 
            methods: ["GET", "POST"] 
        }
    });

    io.on("connection", (socket) => {
        console.log(`socket_connected_on_${socket?.id}`);

        socket.on("disconnect", (reason) => {
            console.log(`socket_disconnected_on_${socket?.id}_${reason}`);
        });
    });

    io.engine.on("connection_error", (err) => {
        console.log("💥 ENGINE ERROR");
        console.log("code:", err.code);
        console.log("message:", err.message);
        console.log("context:", err.context);
    });

    io.use((socket, next) => {

        const token = socket.handshake.auth.token;

        if (!token) return next(new Error("unauthorized_access"));

        try {

            const decoded = jwt.verify(token, ACCESS_SECRET) as { sub: string; email: string };
            socket.data.user = decoded; 
            next();
            
        } catch (err) {
            next(new Error("invalid_or_expired_token"));
        }
    });

    return io;
}

export function getIO(): Server {

    if (!io) throw new Error("socket.io_not_initialized");
    return io;
}

