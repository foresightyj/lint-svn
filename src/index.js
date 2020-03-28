#!/usr/bin/env node

//@ts-check
const pLimit = require("p-limit").default;
const chalk = require("chalk");
const assert = require("assert");
const path = require("path");
const micromatch = require("micromatch");
const execa = require("execa");
const commander = require("commander");
const { Warning } = require("./warning");
const { getSvnStatus } = require("./svn");
const { loadConfig } = require("./config");
const { version } = require("../package.json");
const globby = require("globby");

/**
 * @typedef {import("./types").LintConfig} LintConfig
 */

/**
 * @param {LintConfig} config
 * @param {string[]} [files]
 */
async function lint(config, files) {
    /** @type {Warning[]} */
    const warnings = [];
    /** @type {string[]} */
    let stagedFiles = [];
    /** @type {string[]} */
    let nonVersionedFiles = [];
    if (!files) {
        const svnStatuses = await getSvnStatus();
        stagedFiles = svnStatuses
            .filter(s => s.Status === "Added" || s.Status === "Modified")
            .map(s => s.Path);
        nonVersionedFiles = svnStatuses
            .filter(s => s.Status === "NonVersioned")
            .map(s => s.Path);
    } else {
        stagedFiles = files;
        nonVersionedFiles = [];
    }

    /**
     * @param {string} cmd
     * @param {string[]} matched
     * @param {string} globPatt
     */
    async function runCmd(cmd, matched, globPatt) {
        if (cmd.includes("npm") && cmd.includes("--")) {
            assert(cmd.includes("--"), "npm command must postfix with --");
        }
        try {
            const { stdout, command } = await execa(cmd, matched);
            const friendlyCmd = chalk.bgGreen(
                `${cmd} [... ${matched.length} files]`,
            );
            console.log(
                `Linted: ${friendlyCmd} matching ${chalk.bgGreen(globPatt)}.`,
            );
        } catch (e) {
            /** @type {import("execa").ExecaError} */
            const err = e;
            warnings.push(new Warning(err.message));
        }
    }

    const limit = pLimit(config.concurrency || 1);
    const ignoreExtensions = config.ignoreExtensions || [];
    const runables = config.rules.map(rule =>
        limit(async () => {
            if (rule.skip) return;
            const { glob: globPatt, nonVersioned, command } = rule;
            const matchedFiles = micromatch(
                nonVersioned ? nonVersionedFiles : stagedFiles,
                [globPatt],
                {
                    dot: true,
                    matchBase: !globPatt.includes("/"),
                },
            )
                .filter(f => !ignoreExtensions.includes(path.extname(f)))
                .filter(f => path.extname(f));

            if (matchedFiles.length) {
                if (Array.isArray(command)) {
                    for (const cmd of command) {
                        await runCmd(cmd, matchedFiles, globPatt);
                    }
                } else if (typeof command === "function") {
                    const res = await Promise.resolve(command(matchedFiles));
                    if (!res || (Array.isArray(res) && !res.length)) {
                        //ok
                    } else if (Warning.isWarningArray(res)) {
                        /** @type {Warning[]} */
                        // @ts-ignore
                        const ws = res;
                        ws.forEach(r => warnings.push(r));
                    } else {
                        throw new Error("Not implemented");
                    }
                } else {
                    await runCmd(command, matchedFiles, globPatt);
                }
            }
        }),
    );
    await Promise.all(runables);
    Warning.printWarnings(warnings);
}

(async () => {
    commander
        .version(version)
        .option("-a, --all")
        .parse(process.argv);

    const runAll = !!commander.all;
    const { configPath, config } = await loadConfig();

    /** @type {string[]|undefined} */
    let files = undefined;
    if (runAll) {
        const allGlobs = config.rules.map(f => f.glob);
        files = await globby(allGlobs, {
            cwd: path.dirname(configPath),
            gitignore: true,
        });
    }
    await lint(config, files);
})();
