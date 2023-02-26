import { createInterface } from "readline"
import type { Interface } from "readline"

// colors
const BG_YELLOW = 43
const BG_BLUE = 44
const BG_MAGENTA = 45

// logger
const pl = (msg: string, color: number): void =>
  console.log(`\x1b[${color}m${msg}\x1b[0m`)

// emulate a pty like behaviour with console.log
export default class Pty {
  private int: Interface
  constructor(onUserInput: (input: string) => void) {
    this.int = createInterface(process.stdin, process.stdout).on(
      "line",
      (line) => {
        onUserInput(line)
        pl("userPrint: " + line, BG_YELLOW)
      }
    )
  }

  public write(data: string): void {
    pl(data, BG_MAGENTA)
  }

  public writeStatus(status: string): void {
    pl(status, BG_BLUE)
  }

  public close(): void {
    this.int.close()
  }

  public exit(): void {
    process.stdin.unref()
  }
}
