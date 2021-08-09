//@ts-check
const $ = require("shelljs");
const xml2js = require("xml2js");
const execa = require("execa");

/** @typedef {"modified" | "added" | "missing" | "unversioned" | "deleted" | "normal" | "__unknown__"} SvnStatus */
/** @typedef {{Path:string, Status: SvnStatus}} SvnStatusInfo */

/** @type {SvnStatus[]} */
const knownStatuses = [
    "modified",
    "added",
    "missing",
    "unversioned",
    "deleted",
    "normal",
];

/**
 * @returns {Promise<SvnStatusInfo[]>}
 */
async function getSvnStatus() {
    /**
     * @param {string} s
     * @returns {SvnStatus}
     */
    function mapStatus(s) {
        /** @type {SvnStatus} */
        // @ts-ignore
        const _s = s;
        //see http://svnbook.red-bean.com/en/1.7/svn.ref.svn.c.status.html
        if (knownStatuses.includes(_s)) {
            return _s;
        }
        console.error("Cannot map svn status of: " + s);
        return "__unknown__";
    }
    if (!$.which("svn")) {
        const msg = `This command requires svn. Pls install TortoiseSVN command line tool`;
        $.echo(msg);
        $.exit(1);
    }
    const { stdout } = await execa("svn status --xml");
    const parsed = await xml2js.parseStringPromise(stdout);
    const entry = parsed.status.target[0].entry;
    const status = entry.map((e) => ({
        Path: e["$"].path,
        Status: mapStatus(e["wc-status"][0]["$"].item),
    }));
    return status;
}

module.exports = {
    getSvnStatus,
};
