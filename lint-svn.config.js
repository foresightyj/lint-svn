//@ts-check

/** @type {LintConfig} */
const config = {
    concurrency: 5,
    rules: [
        {
            glob: "src/**/*.js",
            command: "prettier --write",
        }
    ],
};

module.exports = config;