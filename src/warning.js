//@ts-check
const chalk = require("chalk");

/**
 * @typedef {import("./types").WarningLevel} WarningLevel
 */

class Warning {
    /**
     * @param {string} message
     * @param {WarningLevel} level
     */
    constructor(message, level = "Medium") {
        this.message = message;
        this.level = level;
    }
    get coloredMessage() {
        if (this.level === "High") {
            return (
                chalk.bgRed(`[${this.level.toUpperCase()}]`) +
                " \t" +
                chalk.red(this.message)
            );
        } else if (this.level === "Medium") {
            return (
                chalk.bgRedBright(`[${this.level.toUpperCase()}]`) +
                " \t" +
                chalk.redBright(this.message)
            );
        } else if (this.level === "Low") {
            return (
                chalk.bgYellow(`[${this.level.toUpperCase()}]`) +
                " \t" +
                chalk.yellow(this.message)
            );
        }
    }

    /**
     * @param {any} input
     * @returns {boolean}
     */
    static isWarningArray(input) {
        return Array.isArray(input) && input[0] && input[0] instanceof Warning;
    }

    /**
     * @param {Warning[]} warnings
     */
    static printWarnings(warnings) {
        for (const w of warnings) {
            console.error(w.coloredMessage);
        }
        /** @param {WarningLevel} level */
        function c(level) {
            return warnings.filter(w => w.level === level).length;
        }
        console.error(
            `Errors: total (${warnings.length}), high (${c(
                "High",
            )}), medium (${c("Medium")}), low (${c("Low")})`,
        );
        process.exit(c("High") + c("Medium"));
    }
}

module.exports = {
    Warning,
};
