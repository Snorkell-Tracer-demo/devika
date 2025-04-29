import {
  agentState,
  internet,
  modelList,
  projectList,
  messages,
  projectFiles,
  searchEngineList,
} from "./store";
import { io } from "socket.io-client";


/**
 * Retrieves the base URL for API requests.
 *
 * This function checks if the code is running in a browser environment.
 * If it is, it determines the host from the window location and constructs
 * the API base URL accordingly. If the code is not running in a browser,
 * it defaults to using 'http://127.0.0.1:1337' as the base URL.
 *
 * @returns {string} The base URL for API requests.
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:1337';
    } else {
      return `http://${host}:1337`;
    }
  } else {
    return 'http://127.0.0.1:1337';
  }
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getApiBaseUrl();
export const socket = io(API_BASE_URL, { autoConnect: false });

/**
 * Checks the server status by making an asynchronous fetch request to the API endpoint.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the fetch request is successful, otherwise `false`.
 * @throws Will throw an error if there is a network issue or if the fetch operation fails.
 */
export async function checkServerStatus() {
  try{await fetch(`${API_BASE_URL}/api/status`) ; return true;}
  catch (error) {
    return false;
  }

}

/**
 * Fetches initial data from the API and updates various lists and local storage.
 *
 * This function performs an asynchronous HTTP GET request to retrieve data from the specified API endpoint.
 * Upon successful retrieval of the data, it updates the projectList, modelList, and searchEngineList with the fetched projects,
 * models, and search engines respectively. Additionally, it stores the entire dataset in local storage under the key "defaultData".
 *
 * @async
 * @function fetchInitialData
 * @returns {Promise<void>} - A Promise that resolves when the data has been successfully fetched and processed.
 *
 * @throws {Error} Throws an error if the fetch operation fails or if there is an issue with processing the response.
 */
export async function fetchInitialData() {
  const response = await fetch(`${API_BASE_URL}/api/data`);
  const data = await response.json();
  projectList.set(data.projects);
  modelList.set(data.models);
  searchEngineList.set(data.search_engines);
  localStorage.setItem("defaultData", JSON.stringify(data));
}

/**
 * Creates a new project with the specified name.
 *
 * @async
 * @function createProject
 * @param {string} projectName - The name of the project to be created.
 * @returns {Promise<void>} - A Promise that resolves when the project creation is successfully completed.
 * @throws {Error} Throws an error if the fetch request fails or if there's a problem with network connectivity.
 *
 * This function sends a POST request to the API endpoint for creating projects.
 * It includes the provided project name in the request body and updates the
 * project list by adding the new project name.
 */
export async function createProject(projectName) {
  await fetch(`${API_BASE_URL}/api/create-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_name: projectName }),
  });
  projectList.update((projects) => [...projects, projectName]);
}

/**
 * Deletes a project by sending a POST request to the server.
 *
 * @async
 * @function deleteProject
 * @param {string} projectName - The name of the project to be deleted.
 * @returns {Promise<void>} A promise that resolves when the deletion is successful.
 * @throws {Error} Throws an error if the fetch request fails or if there are network issues.
 */
export async function deleteProject(projectName) {
  await fetch(`${API_BASE_URL}/api/delete-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_name: projectName }),
  });
}

/**
 * Fetches messages from the server for the currently selected project.
 *
 * This function retrieves messages by sending a POST request to the server's API endpoint.
 * It includes the selected project's name in the request body and updates the `messages` object
 * with the received data.
 *
 * @returns {Promise<void>} A promise that resolves when the messages have been successfully fetched and set.
 * @throws {Error} Throws an error if the fetch operation fails or if there is a problem with the response.
 */
export async function fetchMessages() {
  const projectName = localStorage.getItem("selectedProject");
  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_name: projectName }),
  });
  const data = await response.json();
  messages.set(data.messages);
}

/**
 * Fetches the agent state from the server for the currently selected project.
 *
 * This function retrieves the state of an agent by making a POST request to the server's API endpoint.
 * It uses the `localStorage` to get the selected project name and sends it in the request body.
 * Upon receiving a successful response, it updates the `agentState` with the new state data.
 *
 * @returns {Promise<void>} - A promise that resolves when the agent state is successfully fetched and updated.
 * @throws {Error} - Throws an error if the fetch operation fails or if there is an issue with parsing the response JSON.
 */
export async function fetchAgentState() {
  const projectName = localStorage.getItem("selectedProject");
  const response = await fetch(`${API_BASE_URL}/api/get-agent-state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_name: projectName }),
  });
  const data = await response.json();
  agentState.set(data.state);
}

/**
 * Executes an agent with the given prompt using the selected model and project from local storage.
 *
 * @param {string} prompt - The input prompt to be sent to the agent for execution.
 * @returns {Promise<void>} A promise that resolves when both API requests complete.
 * @throws Will throw an alert if no model ID is found in local storage.
 */
export async function executeAgent(prompt) {
  const projectName = localStorage.getItem("selectedProject");
  const modelId = localStorage.getItem("selectedModel");

  if (!modelId) {
    alert("Please select the LLM model first.");
    return;
  }

  await fetch(`${API_BASE_URL}/api/execute-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      base_model: modelId,
      project_name: projectName,
    }),
  });

  await fetchMessages();
}

/**
 * Fetches a browser snapshot from the server.
 *
 * @async
 * @function getBrowserSnapshot
 * @param {string} snapshotPath - The path to the snapshot file.
 * @returns {Promise<string>} A promise that resolves to the snapshot data.
 * @throws {Error} Throws an error if the fetch request fails or the response is not OK.
 */
export async function getBrowserSnapshot(snapshotPath) {
  const response = await fetch(`${API_BASE_URL}/api/browser-snapshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ snapshot_path: snapshotPath }),
  });
  const data = await response.json();
  return data.snapshot;
}

/**
 * Fetches project files from the server using the selected project name stored in localStorage.
 *
 * @async
 * @function fetchProjectFiles
 * @returns {Promise<Array>} - A promise that resolves to an array of file objects representing the project's files.
 *
 * @throws {Error} - Throws an error if the fetch request fails or if there is no selected project in localStorage.
 */
export async function fetchProjectFiles() {
  const projectName = localStorage.getItem("selectedProject");
  const response = await fetch(`${API_BASE_URL}/api/get-project-files?project_name=${projectName}`)
  const data = await response.json();
  projectFiles.set(data.files);
  return data.files;
}

/**
 * Checks the current internet connectivity status of the device.
 *
 * This function uses the `navigator.onLine` property to determine if the device is currently connected to the internet.
 * If the device is online, it sets the `internet` state to true; otherwise, it sets it to false.
 *
 * @returns {Promise<void>} A promise that resolves when the internet status has been checked and updated.
 */
export async function checkInternetStatus() {
  if (navigator.onLine) {
    internet.set(true);
  } else {
    internet.set(false);
  }
}

/**
 * Fetches settings from the API.
 *
 * @async
 * @function fetchSettings
 * @returns {Promise<Object>} A promise that resolves to an object containing the settings.
 * @throws {Error} If there is a network error or if the response is not OK.
 */
export async function fetchSettings() {
  const response = await fetch(`${API_BASE_URL}/api/settings`);
  const data = await response.json();
  return data.settings;
}

/**
 * Updates the application settings by sending them to the server.
 *
 * @async
 * @param {Object} settings - An object containing the settings to be updated.
 * @throws {Error} Throws an error if the fetch request fails.
 */
export async function updateSettings(settings) {
  await fetch(`${API_BASE_URL}/api/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
}

/**
 * Fetches logs from the server.
 *
 * This function sends an asynchronous request to the server's API endpoint for logs.
 * It returns a promise that resolves with the logs data parsed from the response.
 *
 * @returns {Promise<Array>} A promise that resolves with an array of log entries.
 *
 * @throws {Error} Throws an error if the fetch operation fails or if the response is not ok.
 */
export async function fetchLogs() {
  const response = await fetch(`${API_BASE_URL}/api/logs`);
  const data = await response.json();
  return data.logs;
}
