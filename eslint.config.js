import globals from "globals";
import prettier from "eslint-config-prettier";

/** Foundry VTT global variables available at runtime. */
const foundryGlobals = {
  // Core application
  game: "readonly",
  ui: "readonly",
  canvas: "readonly",
  CONFIG: "readonly",
  CONST: "readonly",
  Hooks: "readonly",

  // Settings & utilities
  foundry: "readonly",
  fromUuid: "readonly",
  fromUuidSync: "readonly",
  getDocumentClass: "readonly",
  loadTemplates: "readonly",
  renderTemplate: "readonly",
  fetchJsonWithTimeout: "readonly",
  debounce: "readonly",
  duplicate: "readonly",
  mergeObject: "readonly",
  setProperty: "readonly",
  getProperty: "readonly",
  hasProperty: "readonly",
  expandObject: "readonly",
  flattenObject: "readonly",
  isEmpty: "readonly",
  randomID: "readonly",
  deepClone: "readonly",

  // Documents
  Actor: "readonly",
  Item: "readonly",
  Scene: "readonly",
  Token: "readonly",
  User: "readonly",
  ChatMessage: "readonly",
  Combat: "readonly",
  Folder: "readonly",
  JournalEntry: "readonly",
  Macro: "readonly",
  Playlist: "readonly",
  RollTable: "readonly",
  Setting: "readonly",

  // Collections
  Actors: "readonly",
  Items: "readonly",
  Scenes: "readonly",
  Users: "readonly",
  Messages: "readonly",

  // Applications
  Application: "readonly",
  Dialog: "readonly",
  FormApplication: "readonly",
  FilePicker: "readonly",

  // Dice
  Roll: "readonly",
  Die: "readonly",
  DiceTerm: "readonly",

  // Canvas layers & objects
  TokenLayer: "readonly",
  TokenDocument: "readonly",
  PlaceableObject: "readonly",

  // Handlebars
  Handlebars: "readonly",

  // Socket
  socketlib: "readonly",
};

export default [
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...foundryGlobals,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-shadow": "warn",
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
  prettier,
];
