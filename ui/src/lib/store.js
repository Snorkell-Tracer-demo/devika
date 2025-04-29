import { writable } from 'svelte/store';

// Helper function to get item from localStorage
/**
 * Retrieves an item from localStorage. If the item does not exist,
 * sets it with a default value and returns that default value.
 *
 * @param {string} key - The key under which the item is stored in localStorage.
 * @param {*} defaultValue - The value to be used if the item does not exist in localStorage.
 * @returns {*} The value retrieved from localStorage or the default value if the item was not found.
 */
function getItemFromLocalStorage(key, defaultValue) {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
        return storedValue;
    }
    localStorage.setItem(key, defaultValue);
    return defaultValue;
}

// Helper function to handle subscription and local storage setting
/**
 * Subscribes to changes in the provided store and synchronizes its value with localStorage.
 *
 * @param {Object} store - The store object that supports `set` and `subscribe` methods.
 * @param {string} key - The localStorage key under which the data will be stored.
 * @param {*} defaultValue - The default value to use if no value is found in localStorage for the given key.
 *
 * @example
 * const myStore = createStore();
 * subscribeAndStore(myStore, 'userSettings', { theme: 'light' });
 */
function subscribeAndStore(store, key, defaultValue) {
    store.set(getItemFromLocalStorage(key, defaultValue));
    store.subscribe(value => {
        localStorage.setItem(key, value);
    });
}

// Server related stores
export const serverStatus = writable(false);
export const internet = writable(true);

// Message related stores
export const messages = writable([]);
export const projectFiles = writable(null);

// Selection related stores
export const selectedProject = writable('');
export const selectedModel = writable('');
export const selectedSearchEngine = writable('');

subscribeAndStore(selectedProject, 'selectedProject', 'select project');
subscribeAndStore(selectedModel, 'selectedModel', 'select model');
subscribeAndStore(selectedSearchEngine, 'selectedSearchEngine', 'select search engine');

// List related stores
export const projectList = writable([]);
export const modelList = writable({});
export const searchEngineList = writable([]);

// Agent related stores
export const agentState = writable(null);
export const isSending = writable(false);

// Token usage store
export const tokenUsage = writable(0);
