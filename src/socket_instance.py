# socketio_instance.py
from flask_socketio import SocketIO
from src.logger import Logger
socketio = SocketIO(cors_allowed_origins="*", async_mode="gevent")

logger = Logger()


def emit_agent(channel, content, log=True):
    """Emit a message to a specified channel using SocketIO.
    
    This function sends a message to a given channel and optionally logs the emission. If an error occurs during the
    emission, it logs the error and returns False.
    
    Args:
        channel (str): The name of the channel to which the message will be emitted.
        content (any): The content of the message to be sent.
        log (bool): A flag indicating whether to log the message emission. Defaults to True.
    
    Returns:
        bool: True if the message is successfully emitted, False otherwise.
    """
    try:
        socketio.emit(channel, content)
        if log:
            logger.info(f"SOCKET {channel} MESSAGE: {content}")
        return True
    except Exception as e:
        logger.error(f"SOCKET {channel} ERROR: {str(e)}")
        return False
