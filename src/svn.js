//@ts-check
const $ = require("shelljs");
const execa = require("execa");

/** @typedef {"Modified" | "Added" | "Missing" | "NonVersioned" | "Other"} SvnStatus */
/** @typedef {{Path:string, Status: SvnStatus}} SvnStatusInfo */

/**
 * @returns {Promise<SvnStatusInfo[]>}
 */
async function getSvnStatus() {
    /**
     * @param {string} s
     * @returns {SvnStatus}
     */
    function mapStatus(s) {
        //see http://svnbook.red-bean.com/en/1.7/svn.ref.svn.c.status.html
        if (s === "!") {
            return "Missing";
        } else if (s === "A") {
            return "Added";
        } else if (s === "M") {
            return "Modified";
        } else if (s === "?") {
            return "NonVersioned";
        }
        return "Other";
    }
    if (!$.which("svn")) {
        const msg = `This command requires svn. Pls install TortoiseSVN command line tool`;
        $.echo(msg);
        $.exit(1);
    }
    const { stdout } = await execa("svn status");
    return stdout
        .split("\n")
        .map(s => s.trim())
        .filter(s => s)
        .map(s => s.split("    ").map(t => t.trim()))
        .map(a => ({
            Status: mapStatus(a[0]),
            Path: a[1],
        }));
}

module.exports = {
    getSvnStatus,
}