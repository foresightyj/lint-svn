# Note

Svn itself doesn't have a concept of client-side hooks. It only had server side hooks. But it is made possible by TortoiseSVN.

# Installation

    npm install --save-dev lint-svn

# Configuration

Create a config file in your root directory of name: `.lintsvnrc.js` or `lint-svn.config.js`, which has the following content

```js
//@ts-check

/**
 * @param {string[]} files
 */
async function checkunversioned(files) {
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
            //if false, only lint added & modified files
            nonVersioned: true,
            command: checkunversioned,
        },
    ],
};
```

Then run `npx lint-svn` to see the effect.

# Configure TortoiseSvn Client-Side Hook

First read: [Client Side Hook Scripts
](https://tortoisesvn.net/docs/release/TortoiseSVN_en/tsvn-dug-settings.html#tsvn-dug-settings-hooks)

You still needed a bootstrap script for TortoiseSVN to call and pass command line args to. For me, I had a script called `preCommitHook.js` with content like:

```js
//@ts-check

// ToritoiseSVN calls your script with these args:
// D:\MyProject\preCommitHook.js, C:\Users\ADMINI~1\AppData\Local\Temp\svnC121.tmp, 3, C:\Users\ADMINI~1\AppData\Local\Temp\svnC122.tmp, D:\Working\MyProject\src\pages\base

const $ = require("shelljs");
const res = $.exec("npm run lint-svn");
if(res.code){
    console.error(res.stderr);
    process.exit(res.code)
}
```

Right click the project folder -> TortoiseSVN -> Properties, and add a property:

`tsvn:precommithook`: `node %REPOROOT%/trunk/MyProject/preCommitHook.js`

