import type { PicoSerialCom } from "./picoSerialCom"
import * as commands from "./commands"

export default class ControllOps {
  private serialCom: PicoSerialCom

  constructor(serialCom: PicoSerialCom) {
    this.serialCom = serialCom
  }

  private isNotOpen(): boolean | undefined {
    return this.serialCom.isOpen() ? undefined : true
  }

  /**
   * Resets the REPL without restarting the board.
   */
  public softReset(): void {
    this.isNotOpen() || this.serialCom.send(commands.softyReset)
  }

  /**
   * Resets the board which restarts the board which leads to it reconnecting to OS.
   */
  public hardReset(): void {
    this.isNotOpen() || this.serialCom.send(commands.softHardReset)
  }

  /**
   * Reboots the board softly...
   */
  public softReboot(): void {
    this.isNotOpen() || this.serialCom.send(commands.softReboot)
  }
}
