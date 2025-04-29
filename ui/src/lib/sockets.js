import { socket } from "./api";
import { messages, agentState, isSending, tokenUsage } from "./store";
import { toast } from "svelte-sonner";
import { get } from "svelte/store";

let prevMonologue = null;

/**
 * Initializes socket connections and event listeners for handling various server responses.
 *
 * This function sets up the initial connection with the server using `socket.connect()`.
 * It also defines several event listeners to handle different types of messages received from the server,
 * such as socket responses, agent state updates, token usage, inference errors, and informational messages.
 * Additionally, it subscribes to changes in the agent state to update the UI accordingly.
 *
 * @throws {Error} Throws an error if there is a problem establishing or managing socket connections.
 */
export function initializeSockets() {

  socket.connect();
  
  let state = get(agentState);
  prevMonologue = state?.internal_monologue;

  socket.emit("socket_connect", { data: "frontend connected!" });
  socket.on("socket_response", function (msg) {
    console.log(msg);
  });

  socket.on("server-message", function (data) {
    console.log(data)
    messages.update((msgs) => [...msgs, data["messages"]]);
  });

  socket.on("agent-state", function (state) {
    const lastState = state[state.length - 1];
    agentState.set(lastState);
    if (lastState.completed) {
      isSending.set(false);
    }
  });

  socket.on("tokens", function (tokens) {
    tokenUsage.set(tokens["token_usage"]);
  });

  socket.on("inference", function (error) {
    if (error["type"] == "error") {
      toast.error(error["message"]);
      isSending.set(false);
    } else if (error["type"] == "warning") {
      toast.warning(error["message"]);
    }
  });

  socket.on("info", function (info) {
    if (info["type"] == "error") {
      toast.error(info["message"]);
      isSending.set(false);
    } else if (info["type"] == "warning") {
      toast.warning(info["message"]);
    } else if (info["type"] == "info") {
      toast.info(info["message"]);
    }
  });

  
  agentState.subscribe((state) => {
    /**
     * Handles changes to the monologue value by displaying a toast notification.
     *
     * @param {string} newValue - The new value of the monologue.
     */
    function handleMonologueChange(newValue) {
      if (newValue) {
        toast(newValue);
      }
    }
    if (
      state &&
      state.internal_monologue &&
      state.internal_monologue !== prevMonologue
    ) {
      handleMonologueChange(state.internal_monologue);
      prevMonologue = state.internal_monologue;
    }
  });
}

/**
 * Disconnects from the socket and removes all event listeners associated with it.
 *
 * This function checks if the socket is currently connected. If it is, it proceeds to
 * unregister various event handlers related to different types of server responses and messages.
 *
 * @throws {Error} Throws an error if there is a problem during the disconnection or removal of listeners.
 */
export function destroySockets() {
  if (socket.connected) {
    socket.off("socket_response");
    socket.off("server-message");
    socket.off("agent-state");
    socket.off("tokens");
    socket.off("inference");
    socket.off("info");
  }
}

/**
 * Emits a message to a specified channel via a socket connection.
 *
 * @param {string} channel - The channel to which the message will be emitted.
 * @param {*} message - The message to emit. Can be of any type depending on the requirements.
 */
export function emitMessage(channel, message) {
  socket.emit(channel, message);
}

/**
 * Registers a listener for a specified socket channel.
 *
 * @param {string} channel - The channel to listen on. This should be a valid socket event name.
 * @param {Function} callback - The function to execute when the specified channel receives data.
 *   This callback function will receive the data sent through the channel as its argument.
 *
 * @throws {TypeError} Throws a TypeError if the `channel` is not a string or if the `callback` is not a function.
 *
 * @example
 * socketListener('userMessage', (data) => {
 *   console.log(data);
 * });
 */
export function socketListener(channel, callback) {
  socket.on(channel, callback);
}
