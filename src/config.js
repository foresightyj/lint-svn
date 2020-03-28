//@ts-check
const assert = require("assert");
const { cosmiconfig } = require("cosmiconfig");

/**
 * @param {string} configPath 
 */
function resolveConfig(configPath) {
    try {
        return require.resolve(configPath)
    } catch {
        return configPath
    }
}


/**
 * @param {string} [configPath] 
 * @returns {Promise<LintConfig>}
 */
async function loadConfig(configPath) {
    const explorer = cosmiconfig('lint-staged', {
        searchPlaces: [
            '.lintsvnrc.js',
            'lint-svn.config.js'
        ]
    })
    const resP = configPath ? explorer.load(resolveConfig(configPath)) : explorer.search()
    const res = await resP;
    /** @type {LintConfig} */
    // @ts-ignore
    const config = res.config;
    assert(config, "config is falsy");
    assert(config.rules, "rules not defined in config");
    assert(Array.isArray(config.rules), "rules is not array");
    for (const rule of config.rules) {
        assert(rule.glob, "rule.glob not defined");
        assert(rule.command, "rule.command not defined");
    }
    return config;
}

module.exports = {
    loadConfig,
}