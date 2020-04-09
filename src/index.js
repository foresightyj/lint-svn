#!/usr/bin/env node

//@ts-check
const pLimit = require("p-limit").default;
const chalk = require("chalk");
const assert = require("assert");
const chunk = require("chunk");
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
 * @typedef {import("./types").TaskFn} TaskFn
 * @typedef {import("./types").CommandDefinition} CommandDefinition
 */

/**
 * @param {LintConfig} config
 * @param {boolean} isDebug
 * @param {string[]} [files]
 */
async function lint(config, isDebug, files) {
    /** @type {Warning[]} */
    const warnings = [];
    /** @type {string[]} */
    let stagedFiles = [];
    /** @type {string[]} */
    let nonVersionedFiles = [];
    if (!files) {
        const svnStatuses = await getSvnStatus();
        stagedFiles = svnStatuses
            .filter((s) => s.Status === "added" || s.Status === "modified")
            .map((s) => s.Path);
        nonVersionedFiles = svnStatuses
            .filter((s) => s.Status === "unversioned")
            .map((s) => s.Path);
    } else {
        stagedFiles = files;
        nonVersionedFiles = [];
    }

    /**
     * @param {string} cmd
     * @param {string[]} matched
     * @param {string} globPatt
     */
    async function runShell(cmd, matched, globPatt) {
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
    /**
     * @param {TaskFn} task
     * @param {string[]} matched
     * @param {string} globPatt
     */
    async function runTaskFn(task, matched, globPatt) {
        const res = await Promise.resolve(task(matched));
        if (!res || (Array.isArray(res) && !res.length)) {
            //ok
        } else if (Warning.isWarningArray(res)) {
            /** @type {Warning[]} */
            // @ts-ignore
            const ws = res;
            ws.forEach((r) => warnings.push(r));
        } else {
            throw new Error("Not implemented");
        }
    }

    /**
     * @param {CommandDefinition} command
     * @param {string[]} matchedFiles
     * @param {string} globPatt
     */
    async function runCommand(command, matchedFiles, globPatt) {
        if (typeof command === "function") {
            await runTaskFn(command, matchedFiles, globPatt);
        } else if (typeof command === "string") {
            await runShell(command, matchedFiles, globPatt);
        } else {
            for (const cmd of command) {
                await runCommand(cmd, matchedFiles, globPatt);
            }
        }
    }

    const limit = pLimit(config.concurrency || 1);
    const ignoreExtensions = config.ignoreExtensions || [];
    const runables = config.rules.map((rule) =>
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
                .filter((f) => !ignoreExtensions.includes(path.extname(f)))
                .filter((f) => path.extname(f));

            if (isDebug) {
                console.log(`Matched ${matchedFiles.length} for rule:`, rule);
            }

            if (matchedFiles.length) {
                await runCommand(command, matchedFiles, globPatt);
            }
        }),
    );
    await Promise.all(runables);
    return warnings;
}

(async () => {
    commander
        .version(version)
        .option("-g, --glob <glob>")
        .option("-d, --debug")
        .parse(process.argv);

    const isDebug = !!commander.debug;
    const { configPath, config } = await loadConfig();

    /** @type {string[]|undefined} */
    let files = undefined;
    /** @type {string | undefined} */
    const g = commander.glob;
    if (g) {
        files = await globby(g, {
            cwd: path.dirname(configPath),
            gitignore: true,
        });
        console.log(files.length + " files matching: " + g);
    }
    if (!files) {
        const warnings = await lint(config, isDebug, files);
        Warning.printWarnings(warnings);
    } else if (files.length) {
        /** @type {Warning[]} */
        const warnings = [];
        for (const ch of chunk(files, 200)) {
            console.log(ch);
            const ws = await lint(config, isDebug, ch);
            ws.forEach((w) => warnings.push(w));
        }
        Warning.printWarnings(warnings);
    }
})();
