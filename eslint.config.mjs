import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      ".vite",
      "out",
      "build",
      "coverage",
      "*.min.js",
      "*.d.ts",
      "**/*.config.js",
      "**/*.config.ts",
      ".prettierrc",
      ".stylelintrc.json",
      ".lintstagedrc.js",
    ],
  },
  // 关闭与 Prettier 冲突的规则，格式完全交给 Prettier
  eslintConfigPrettier,

  // =========================
  // Electron: Main/Preload（Node 环境）
  // =========================
  {
    files: ["src/main.ts", "src/preload.ts", "src/**/*.main.{ts,tsx}", "src/**/*.preload.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        // Electron 项目里主进程/预加载不强依赖类型检查，避免 tsconfig/TS 版本差异导致 eslint 卡死
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      import: importPlugin,
      "@typescript-eslint": tseslint,
      "unused-imports": unusedImports,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        alias: {
          map: [["@", "./src"]],
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".scss", ".css", ".less"],
        },
      },
    },
    rules: {
      // 通用
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "no-param-reassign": "error",

      // TS（不做类型信息规则，避免 Electron 工程的 tsconfig 分包问题）
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^React$|^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // 导入
      "no-duplicate-imports": "off",
      "import/no-duplicates": ["error", { "prefer-inline": false }],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          pathGroups: [
            { pattern: "electron", group: "external", position: "before" },
            { pattern: "node:*", group: "builtin", position: "before" },
            { pattern: "@/**", group: "internal", position: "after" },
            { pattern: "**/*.{css,scss,less}", group: "index", position: "after" }
          ],
          pathGroupsExcludedImportTypes: ["electron"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ],

      // Prettier 接管这些细节
      indent: "off",
      quotes: "off",
      semi: "off",
      "comma-dangle": "off",
    },
  },

  // =========================
  // Renderer（React/浏览器环境）
  // =========================
  {
    files: ["src/**/*.{ts,tsx}", "src/renderer.tsx", "src/app/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    ignores: ["src/main.ts", "src/preload.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
      "@typescript-eslint": tseslint,
      "unused-imports": unusedImports,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        alias: {
          map: [["@", "./src"]],
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".scss", ".css", ".less"],
        },
      },
    },
    rules: {
      // React
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
      "react/self-closing-comp": "error",

      // 通用
      "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }],
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "no-param-reassign": "error",

      // TS
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^React$|^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // 导入（保持 web 的导入分组习惯）
      "no-duplicate-imports": "off",
      "import/no-duplicates": ["error", { "prefer-inline": false }],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },
            { pattern: "{react-dom,react-router-dom}", group: "external", position: "before" },
            { pattern: "@/**", group: "internal", position: "after" },
            { pattern: "**/*.{css,scss,less}", group: "index", position: "after" }
          ],
          pathGroupsExcludedImportTypes: ["react", "react-dom", "react-router-dom"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ],

      // 复杂度
      "max-params": ["error", { max: 4 }],
      "max-len": [
        "error",
        {
          code: 120,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreComments: true,
        },
      ],

      // Prettier 接管这些细节
      indent: "off",
      quotes: "off",
      semi: "off",
      "comma-dangle": "off",
    },
  },

  // =========================
  // 配置文件放宽
  // =========================
  {
    files: ["forge.config.ts", "vite.*.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
