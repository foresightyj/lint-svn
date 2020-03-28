declare type WarningLevel =  "High" | "Medium" | "Low";

type TaskFn = (filenames: string[]) => Warning[] | Promise<Warning[]> | string | string[] | Promise<string | string[]>

interface LintConfig {
    concurrency?: number,
    rules: {
        glob: string;
        command: string | string[] | TaskFn;
        skip?: boolean;
        nonVersioned?: boolean;
    }[]
}