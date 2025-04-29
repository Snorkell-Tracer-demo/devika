"""
    DO NOT REARRANGE THE ORDER OF THE FUNCTION CALLS AND VARIABLE DECLARATIONS
    AS IT MAY CAUSE IMPORT ERRORS AND OTHER ISSUES
"""
from gevent import monkey
monkey.patch_all()
from src.init import init_devika
init_devika()


from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from src.socket_instance import socketio, emit_agent
import os
import logging
from threading import Thread
import tiktoken

from src.apis.project import project_bp
from src.config import Config
from src.logger import Logger, route_logger
from src.project import ProjectManager
from src.state import AgentState
from src.agents import Agent
from src.llm import LLM


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": # Change the origin to your frontend URL
                             [
                                 "https://localhost:3000",
                                 "http://localhost:3000",
                                 ]}}) 
app.register_blueprint(project_bp)
socketio.init_app(app)


log = logging.getLogger("werkzeug")
log.disabled = True


TIKTOKEN_ENC = tiktoken.get_encoding("cl100k_base")

os.environ["TOKENIZERS_PARALLELISM"] = "false"

manager = ProjectManager()
AgentState = AgentState()
config = Config()
logger = Logger()


# initial socket
@socketio.on('socket_connect')
def test_connect(data):
    """Handle a socket connection event.
    
    This function is triggered when a client connects to the server via a socket. It prints a confirmation message and emits
    a response back to the client indicating that the server is connected.
    
    Args:
        data (dict): Data received with the socket connection event.
    """
    print("Socket connected :: ", data)
    emit_agent("socket_response", {"data": "Server Connected"})


@app.route("/api/data", methods=["GET"])
@route_logger(logger)
def data():
    """Define a route to fetch data including projects, language models, and search engines.
    
    This function handles GET requests at the "/api/data" endpoint. It retrieves a list of projects from the manager, lists
    available language models using LLM, and defines a predefined list of search engines. The function returns a JSON
    response containing these three pieces of information.
    
    Returns:
        dict: A dictionary with keys 'projects', 'models', and 'search_engines' containing respective lists.
    """
    project = manager.get_project_list()
    models = LLM().list_models()
    search_engines = ["Bing", "Google", "DuckDuckGo"]
    return jsonify({"projects": project, "models": models, "search_engines": search_engines})


@app.route("/api/messages", methods=["POST"])
def get_messages():
    """Retrieve messages for a specified project.
    
    This function extracts the 'project_name' from the JSON data sent in the POST request, then retrieves and returns the
    associated messages using the `manager.get_messages` method.
    
    Returns:
        dict: A JSON object containing a list of messages under the key "messages".
    """
    data = request.json
    project_name = data.get("project_name")
    messages = manager.get_messages(project_name)
    return jsonify({"messages": messages})


# Main socket
@socketio.on('user-message')
def handle_message(data):
    """Handle a user message received via Socket.IO.
    
    This function processes incoming user messages by extracting relevant data such as the message content, base model,
    project name, and search engine. It then determines whether to start a new agent execution or continue with an existing
    one based on the current state of the project.
    
    Args:
        data (dict): A dictionary containing the following keys:
            - 'message' (str): The user's input message.
            - 'base_model' (str): The base model to be used for processing.
            - 'project_name' (str): The name of the project associated with the message.
            - 'search_engine' (str): The search engine to be used, which will be converted to lowercase.
    """
    logger.info(f"User message: {data}")
    message = data.get('message')
    base_model = data.get('base_model')
    project_name = data.get('project_name')
    search_engine = data.get('search_engine').lower()

    agent = Agent(base_model=base_model, search_engine=search_engine)

    state = AgentState.get_latest_state(project_name)
    if not state:
        thread = Thread(target=lambda: agent.execute(message, project_name))
        thread.start()
    else:
        if AgentState.is_agent_completed(project_name):
            thread = Thread(target=lambda: agent.subsequent_execute(message, project_name))
            thread.start()
        else:
            emit_agent("info", {"type": "warning", "message": "previous agent doesn't completed it's task."})
            last_state = AgentState.get_latest_state(project_name)
            if last_state["agent_is_active"] or not last_state["completed"]:
                thread = Thread(target=lambda: agent.execute(message, project_name))
                thread.start()
            else:
                thread = Thread(target=lambda: agent.subsequent_execute(message, project_name))
                thread.start()

@app.route("/api/is-agent-active", methods=["POST"])
@route_logger(logger)
def is_agent_active():
    """Check if an agent is active based on the provided project name.
    
    This function receives a JSON payload containing a project name and checks if the corresponding agent is active. It uses
    the `AgentState.is_agent_active` method to determine the agent's status and returns the result as a JSON response.
    
    Args:
        project_name (str): The name of the project for which to check the agent's activity.
    
    Returns:
        dict: A dictionary with a single key 'is_active' indicating whether the agent is active.
    """
    data = request.json
    project_name = data.get("project_name")
    is_active = AgentState.is_agent_active(project_name)
    return jsonify({"is_active": is_active})


@app.route("/api/get-agent-state", methods=["POST"])
@route_logger(logger)
def get_agent_state():
    """Retrieve the latest state of an agent.
    
    This function processes a POST request to obtain the current state of an agent  associated with a specific project. It
    extracts the project name from the JSON  payload, fetches the latest agent state using the `AgentState.get_latest_state`
    method, and returns the state in a JSON response.
    
    Returns:
        dict: A JSON object containing the agent's current state under the key 'state'.
    """
    data = request.json
    project_name = data.get("project_name")
    agent_state = AgentState.get_latest_state(project_name)
    return jsonify({"state": agent_state})


@app.route("/api/get-browser-snapshot", methods=["GET"])
@route_logger(logger)
def browser_snapshot():
    """Serve a file from the specified snapshot path.
    
    This function retrieves the 'snapshot_path' parameter from the request arguments and sends the corresponding file as an
    attachment. The file is expected to be located at the provided path. If the path is not valid or the file does not
    exist, the behavior will depend on Flask's default error handling for missing files.
    
    Args:
        snapshot_path (str): A string representing the path to the snapshot file to be served.
    
    Returns:
        Response: A response object containing the file sent as an attachment.
    """
    snapshot_path = request.args.get("snapshot_path")
    return send_file(snapshot_path, as_attachment=True)


@app.route("/api/get-browser-session", methods=["GET"])
@route_logger(logger)
def get_browser_session():
    """Retrieve the browser session information for a specified project.
    
    This function handles a GET request to the '/api/get-browser-session' endpoint. It retrieves the 'project_name' from the
    query parameters, fetches the latest agent state associated with the project, and returns the browser session
    information in JSON format. If no agent state is found for the given project, it returns a JSON object indicating that
    there is no session available.
    
    Args:
        project_name (str): The name of the project to fetch the browser session for.
    
    Returns:
        dict: A JSON response containing the browser session information or None if
            no session is available.
    """
    project_name = request.args.get("project_name")
    agent_state = AgentState.get_latest_state(project_name)
    if not agent_state:
        return jsonify({"session": None})
    else:
        browser_session = agent_state["browser_session"]
        return jsonify({"session": browser_session})


@app.route("/api/get-terminal-session", methods=["GET"])
@route_logger(logger)
def get_terminal_session():
    """Get the terminal session state for a specified project.
    
    This function retrieves the latest agent state for a given project name and returns the terminal session state. If no
    agent state is found, it returns None.
    
    Args:
        project_name (str): The name of the project to retrieve the terminal session state for.
    
    Returns:
        dict: A JSON object containing the terminal state or None if no agent state is found.
    """
    project_name = request.args.get("project_name")
    agent_state = AgentState.get_latest_state(project_name)
    if not agent_state:
        return jsonify({"terminal_state": None})
    else:
        terminal_state = agent_state["terminal_session"]
        return jsonify({"terminal_state": terminal_state})


@app.route("/api/run-code", methods=["POST"])
@route_logger(logger)
def run_code():
    """Run user-provided code in a specified project.
    
    This function handles POST requests to the '/api/run-code' endpoint. It extracts the project name and code from the JSON
    payload, logs the request using the route_logger, and initiates the code execution process. The current implementation
    only returns a message indicating that code execution has started.
    
    Returns:
        dict: A JSON response with a message indicating the start of code execution.
    """
    data = request.json
    project_name = data.get("project_name")
    code = data.get("code")
    # TODO: Implement code execution logic
    return jsonify({"message": "Code execution started"})


@app.route("/api/calculate-tokens", methods=["POST"])
@route_logger(logger)
def calculate_tokens():
    """Calculate the token usage of a given text prompt.
    
    This function receives a POST request with a JSON payload containing a 'prompt'. It calculates the number of tokens in
    the prompt using the TIKTOKEN_ENC encoder and returns the count as part of the response.
    
    Returns:
        dict: A dictionary containing the key 'token_usage' with the value being the number of tokens in the prompt.
    """
    data = request.json
    prompt = data.get("prompt")
    tokens = len(TIKTOKEN_ENC.encode(prompt))
    return jsonify({"token_usage": tokens})


@app.route("/api/token-usage", methods=["GET"])
@route_logger(logger)
def token_usage():
    """Retrieve the latest token usage for a specified project.
    
    This function handles GET requests to the '/api/token-usage' endpoint. It retrieves the 'project_name' from the request
    arguments and uses it to fetch the latest token usage count from the AgentState. The result is then returned as a JSON
    response containing the token usage information.
    
    Returns:
        dict: A dictionary with a single key 'token_usage' that contains the token count for the specified project.
    """
    project_name = request.args.get("project_name")
    token_count = AgentState.get_latest_token_usage(project_name)
    return jsonify({"token_usage": token_count})


@app.route("/api/logs", methods=["GET"])
def real_time_logs():
    """Route to retrieve real-time logs from a log file.
    
    This function reads the content of a log file using the `logger` module and returns it as a JSON response. The route is
    accessible via a GET request at `/api/logs`.
    
    Returns:
        dict: A dictionary containing the logs read from the log file, wrapped in a "logs" key.
    """
    log_file = logger.read_log_file()
    return jsonify({"logs": log_file})


@app.route("/api/settings", methods=["POST"])
@route_logger(logger)
def set_settings():
    """Set settings through an API endpoint.
    
    This function handles POST requests to the '/api/settings' endpoint. It retrieves JSON data from the request, updates
    the configuration with the provided data, and returns a success message.
    
    Returns:
        dict: A dictionary containing a success message ("Settings updated").
    """
    data = request.json
    config.update_config(data)
    return jsonify({"message": "Settings updated"})


@app.route("/api/settings", methods=["GET"])
@route_logger(logger)
def get_settings():
    """Retrieve and return application settings.
    
    This function fetches the configuration settings using a predefined method and returns them as a JSON response. The
    settings are encapsulated in a dictionary with a key "settings".
    
    Returns:
        Response: A JSON response containing the application settings.
    """
    configs = config.get_config()
    return jsonify({"settings": configs})


@app.route("/api/status", methods=["GET"])
@route_logger(logger)
def status():
    """Get the server status.
    
    This function handles GET requests to the /api/status endpoint and returns a JSON response indicating that the server is
    running.
    
    Returns:
        flask.Response: A JSON response with the key "status" set to "server is running!".
    """
    return jsonify({"status": "server is running!"})

if __name__ == "__main__":
    logger.info("Devika is up and running!")
    socketio.run(app, debug=False, port=1337, host="0.0.0.0")
