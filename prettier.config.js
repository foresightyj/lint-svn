//@ts-check

/**
 * @typedef {import("prettier").Options} PrettierOptions
 * @typedef {PrettierOptions & {overrides?: {files: string|string[], options: PrettierOptions}[]} } Options
 */

/** @type {Options} */
const config = {
    tabWidth: 4,
    singleQuote: false,
    endOfLine: "crlf",
    overrides: [
        {
            files: ["*.ts", "*.tsx", "*.js", "*.jsx"],
            options: {
                semi: true,
                tabWidth: 4,
                trailingComma: "all",
                singleQuote: false,
            },
        },
    ],
};

module.exports = config;
