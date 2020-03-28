//@ts-check

/**
 * @typedef {import("./src/types").LintConfig} LintConfig 
 */

/** @type {LintConfig} */
const config = {
    ignoreExtensions: [".dll", ".map"],
    concurrency: 5,
    rules: [
        {
            glob: "src/**/*.js",
            command: "prettier --write",
        }
    ],
};

module.exports = config;