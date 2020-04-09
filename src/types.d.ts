//see https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html
import warning from "./warning";

declare namespace lintSvn {
    declare type WarningLevel = "High" | "Medium" | "Low";
    export type WarningConstructor = warning.WarningConstructor;
    type TaskFn = (
        filenames: string[],
    ) =>
        | Warning[]
        | Promise<Warning[]>
        | string
        | string[]
        | Promise<string | string[]>;
    type CommandDefinition = string | string[] | TaskFn | TaskFn[];
    interface LintConfig {
        ignoreExtensions?: string[]
        concurrency?: number;
        rules: {
            glob: string;
            command: CommandDefinition;
            skip?: boolean;
            nonVersioned?: boolean;
        }[];
    }
}

export = lintSvn;
