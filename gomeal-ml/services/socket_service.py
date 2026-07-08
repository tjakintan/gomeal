
def _sockets(sio):

    @sio.event
    async def connect(sid, environ, auth):
        print(f"socket_connected:{sid}")

    @sio.event
    async def disconnect(sid):
        print(f"socket_disconnected:{sid}")
