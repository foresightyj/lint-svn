//@ts-check
const pLimit = require("p-limit").default;
const chalk = require("chalk");
const assert = require("assert");
const path = require("path");
const micromatch = require("micromatch");
const execa = require("execa");
const { Warning } = require("./warning");
const { getSvnStatus } = require("./svn");
const { loadConfig } = require("./config");

const ignoreExts = [".dll", ".map"];

/**
 * @param {LintConfig} config 
 */
async function lint(config) {
    /** @type {Warning[]} */
    const warnings = [];
    const svnStatuses = await getSvnStatus();
    const stagedFiles = svnStatuses
        .filter(s => s.Status === "Added" || s.Status === "Modified")
        .map(s => s.Path);
    const nonVersionedFiles = svnStatuses
        .filter(s => s.Status === "NonVersioned")
        .map(s => s.Path);

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
                .filter(f => !ignoreExts.includes(path.extname(f)))
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
    const config = await loadConfig();
    await lint(config);
})()
