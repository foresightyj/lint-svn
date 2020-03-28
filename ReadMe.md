
Place config file in your root directory of names `.lintsvnrc.js` or `lint-svn.config.js`, which has the following content

```js
//@ts-check

/**
 * @param {string[]} files
 */
async function checkNonVersioned(files) {
    const warnings = [];
    for (const file of files) {
        if(path.extname(file) === ".png")
            warnings.push(
                new Warning(`Please remember to add images to svn`, "High"),
            );
        }
    }
    return warnings;
}

/** @type {LintConfig} */
const lintConfig = {
    ignoreExts:[".dll", ".map"],
    concurrency: 5,
    rules: [
        {
            glob: "src/**/*.(ts|tsx|scss|json)",
            command: ["prettier --write"],
        },
        {
            glob: "src/**/*.(ts|tsx)",
            command: ["eslint --fix"],
        },
        {
            glob: "*",
            //if false, only lint Added & Modified files
            nonVersioned: true,
            command: checkNonVersioned,
        },
    ],
};
```
