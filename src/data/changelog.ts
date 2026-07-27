import { execFileSync } from "node:child_process";

export interface LogEntry {
  hash: string;
  date: Date;
  /** 提交类型前缀（feat/fix/chore/…），无前缀归为 misc */
  type: string;
  subject: string;
}

/**
 * 站点更新日志 = git 提交历史（构建期读取，--no-merges）。
 * 浅克隆 CI 下只能看到部分历史 —— 页面按拿到多少渲染多少，不报错。
 */
export function getChangelog(): LogEntry[] {
  try {
    const out = execFileSync(
      "git",
      ["log", "--no-merges", "--format=%h%x09%cI%x09%s"],
      { encoding: "utf8" },
    );
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, iso, ...rest] = line.split("\t");
        const subject = rest.join("\t");
        const match = subject.match(/^(\w+):\s*(.+)$/);
        return {
          hash,
          date: new Date(iso),
          type: match?.[1] ?? "misc",
          subject: match?.[2] ?? subject,
        };
      });
  } catch {
    return [];
  }
}
