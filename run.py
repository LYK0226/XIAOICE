# Monkey-patch standard lib for eventlet compatibility.
# This makes queue.Queue, threading.Lock, time.sleep, etc. cooperative
# so the SSE streaming generator doesn't block other HTTP requests.
import eventlet
eventlet.monkey_patch(thread=False)  # thread=False: keep real OS threads for asyncio

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
# Make RAG / agent logs visible at DEBUG level so distance scores show up
logging.getLogger("app.rag").setLevel(logging.DEBUG)
logging.getLogger("app.agent").setLevel(logging.DEBUG)

from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Use socketio.run() instead of app.run() for WebSocket support
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
