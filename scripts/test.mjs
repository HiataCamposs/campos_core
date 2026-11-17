// Roda o Vitest com a letra do drive em maiúscula.
//
// No Windows, se o terminal estiver em "c:\..." (minúsculo, comum no VS Code),
// o Vitest carrega duas cópias de si mesmo e todos os testes falham com
// "Cannot read properties of undefined (reading 'config')".
import { spawnSync } from "node:child_process";

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const args = process.argv.slice(2);
const { status } = spawnSync("npx", ["vitest", ...args], {
  cwd,
  stdio: "inherit",
  shell: true,
});
process.exit(status ?? 1);
