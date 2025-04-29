import loader from "@monaco-editor/loader";
import { Icons } from "../icons";

/**
 * Retrieves the programming language associated with a given file type.
 *
 * @param {string} fileType - The file extension or type for which to determine the language.
 * @returns {string|null} - The corresponding programming language as a string, or null if the file type is not recognized.
 */
function getFileLanguage(fileType) {
  const fileTypeToLanguage = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    py: "python",
    java: "java",
    rb: "ruby",
    php: "php",
    cpp: "c++",
    c: "c",
    swift: "swift",
    kt: "kotlin",
    json: "json",
    xml: "xml",
    sql: "sql",
    sh: "shell",
  };
  const language = fileTypeToLanguage[fileType.toLowerCase()];
  return language;
}

/**
 * Retrieves the current theme mode from local storage.
 *
 * This function checks the localStorage for an item named "mode-watcher-mode".
 * If the value is "light", it returns "vs-light"; otherwise, it returns "vs-dark".
 *
 * @returns {string} - The theme mode as either "vs-light" or "vs-dark".
 */
const getTheme = () => {
  const theme = localStorage.getItem("mode-watcher-mode");
  return theme === "light" ? "vs-light" : "vs-dark";
};

/**
 * Initializes the Monaco editor by importing it and configuring the loader.
 *
 * @returns {Promise} A promise that resolves to the result of `loader.init()`.
 * @throws Will throw an error if there is an issue during the import or initialization process.
 */
export async function initializeMonaco() {
  const monacoEditor = await import("monaco-editor");
  loader.config({ monaco: monacoEditor.default });
  return loader.init();
}

/**
 * Initializes a Monaco editor instance within a specified container.
 *
 * @async
 * @param {Object} monaco - The Monaco editor module to be used for initialization.
 * @param {HTMLElement} container - The HTML element where the editor will be mounted.
 * @returns {Promise<Editor>} A Promise that resolves with the initialized Monaco editor instance.
 *
 * @throws {Error} Throws an error if the editor cannot be created within the specified container.
 */
export async function initializeEditorRef(monaco, container) {
  const editor = monaco.editor.create(container, {
    theme: getTheme(),
    readOnly: false,
    automaticLayout: true,
  });
  return editor;
}

/**
 * Creates a Monaco editor model with the given code and file extension.
 *
 * @param {monaco} monaco - The Monaco editor instance.
 * @param {object} file - An object containing the file information.
 * @param {string} file.code - The source code of the file.
 * @param {string} file.file - The full name of the file, including extension.
 *
 * @returns {monaco.editor.ITextModel} - A new Monaco editor model configured with the provided code and language.
 */
export function createModel(monaco, file) {
  const model = monaco.editor.createModel(
    file.code,
    getFileLanguage(file.file.split(".").pop())
  );
  return model;
}

/**
 * Disposes of the given editor instance if it is not null or undefined.
 *
 * @param {Object} editor - The editor instance to be disposed of.
 */
export function disposeEditor(editor) {
  if(editor) editor.dispose();
}

/**
 * Enables tab switching functionality in the editor.
 *
 * @param {Object} editor - The editor instance where tabs will be managed.
 * @param {Object} models - An object containing model data, where keys are filenames and values are associated models.
 * @param {HTMLElement} tabContainer - The HTML element that will contain the tab elements.
 */
export function enableTabSwitching(editor, models, tabContainer) {
  tabContainer.innerHTML = "";
  Object.keys(models).forEach((filename, index) => {
    const tabElement = document.createElement("div");
    tabElement.textContent = filename.split("/").pop();
    tabElement.className = "tab p-2 me-2 rounded-lg text-sm cursor-pointer hover:bg-secondary text-primary whitespace-nowrap";
    tabElement.setAttribute("data-filename", filename);
    tabElement.addEventListener("click", () =>
      switchTab(editor, models, filename, tabElement)
    );
    if (index === Object.keys(models).length - 1) {
      tabElement.classList.add("bg-secondary");
    }
    tabContainer.appendChild(tabElement);
  });
}

/**
 * Switches the active model in the editor to the specified file's model.
 * It also updates the UI by adding 'bg-secondary' class to the selected tab element
 * and removing it from all other tab elements.
 *
 * @param {Object} editor - The code editor instance where models are set.
 * @param {Object} models - An object containing file names as keys and their corresponding models as values.
 * @param {string} filename - The name of the file whose model needs to be activated in the editor.
 * @param {HTMLElement} tabElement - The DOM element representing the tab that was clicked or selected.
 */
function switchTab(editor, models, filename, tabElement) {
  Object.entries(models).forEach(([file, model]) => {
    if (file === filename) {
      editor.setModel(model);
    }
  });

  const allTabElements = tabElement?.parentElement?.children;
  for (let i = 0; i < allTabElements?.length; i++) {
    allTabElements[i].classList.remove("bg-secondary");
  }

  tabElement.classList.add("bg-secondary");
}

/**
 * Initializes the sidebar with elements representing files and folders from the provided models.
 *
 * @param {Object} editor - The code editor instance to manipulate based on user interactions.
 * @param {Object} models - An object where keys are filenames and values are corresponding model objects.
 * @param {HTMLElement} sidebarContainer - The container element in which the sidebar will be rendered.
 */
export function sidebar(editor, models, sidebarContainer) {
  sidebarContainer.innerHTML = "";
  /**
   * Creates a sidebar element representing either a folder or a file.
   *
   * @param {string} filename - The name of the file or folder to be displayed in the sidebar.
   * @param {boolean} isFolder - A flag indicating whether the element represents a folder.
   * @returns {HTMLDivElement} - The created sidebar element with appropriate styling and content.
   *
   * @throws {TypeError} - Throws an error if 'filename' is not a string or 'isFolder' is not a boolean.
   */
  const createSidebarElement = (filename, isFolder) => {
    const sidebarElement = document.createElement("div");
    sidebarElement.classList.add("mx-3", "p-1", "px-2", "cursor-pointer");
    if (isFolder) {
      sidebarElement.innerHTML = `<p class="flex items-center gap-2">${Icons.Folder}${" "}${filename}</p>`;
      // TODO implement folder collapse/expand to the element sidebarElement
    } else {
      sidebarElement.innerHTML = `<p class="flex items-center gap-2">${Icons.File}${" "}${filename}</p>`;
    }
    return sidebarElement;
  };

  /**
   * Changes the background color of the tab at the specified index to 'bg-secondary'.
   *
   * @param {number} index - The zero-based index of the tab element whose color needs to be changed.
   * @throws Will throw an error if there are no elements with the id 'tabContainer'.
   */
  const changeTabColor = (index) => {
    const allTabElements = document.querySelectorAll("#tabContainer")[0].children;
    for (let i = 0; i < allTabElements?.length; i++) {
      allTabElements[i].classList.remove("bg-secondary");
    }
    allTabElements[index].classList.add("bg-secondary");
  }

  const folders = {};

  Object.entries(models).forEach(([filename, model], modelIndex) => {
    const parts = filename.split('/');
    let currentFolder = sidebarContainer;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        const fileElement = createSidebarElement(part, false);
        fileElement.addEventListener("click", () => {
          editor.setModel(model);
          changeTabColor(modelIndex);
        });
        currentFolder.appendChild(fileElement);
      } else {
        const folderName = part;
        if (!folders[folderName]) {
          const folderElement = createSidebarElement(part, true);
          currentFolder.appendChild(folderElement);
          folders[folderName] = folderElement;
          currentFolder = folderElement;
        } else {
          currentFolder = folders[folderName];
        }
      }
    });
  });
}