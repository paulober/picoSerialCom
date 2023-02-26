import ControllOps from "../controllOperations"
import { PicoSerialCom } from "../picoSerialCom"
import Pty from "./pty.test"

/* Custom designed test structure to test functionality not to find bugs like unit tests */

enum SPortClientStatus {
  disconnected,
  connecting,
  softReboot,
  // below are all CONNECTED state childs
  normalREPL,
  rawREPL,
}

export default class SPortClient {
  private client: PicoSerialCom
  private controllOps: ControllOps
  private status: SPortClientStatus = SPortClientStatus.disconnected
  private doesCtrlCOnConnect: boolean
  private pty: Pty

  constructor(doCtrlCOnConnect: boolean) {
    this.doesCtrlCOnConnect = doCtrlCOnConnect
    this.client = new PicoSerialCom(
      (message: Buffer) => this.onMessage(message),
      this.doesCtrlCOnConnect // ctrl-c on connect
    )
    this.controllOps = new ControllOps(this.client)
    this.pty = new Pty(async (input: string) => {
      this.onUserInp(input)
    })
  }

  public async start(): Promise<void> {
    this.status = SPortClientStatus.connecting
    await this.client.connect(
      () => {
        this.status = SPortClientStatus.disconnected
        console.log("Timeout")
      },
      () => {
        console.log("Connected")
      }
    )
  }

  private onMessage(message: Buffer): void {
    // TODO: message maybe special: EOF
    if (message.buffer.byteLength === 1) {
      throw new Error(
        "Message too short, maybe special: " + message.toString("binary")
      )
    }

    // decode message
    const content = message.toString("utf-8")

    if (this.status === SPortClientStatus.connecting) {
      // ignore content before entering normal REPL if ctrlCOnConnect
      if (
        this.doesCtrlCOnConnect &&
        !content.includes('with RP2040\r\nType "help()" for more information.')
      ) {
        return
      }

      // enter normal REPL
      this.status = SPortClientStatus.normalREPL
      this.pty.writeStatus("=== STATUS: normalREPL ===")

      // remove the repl promts before the start message
      const micropythonIdx = content.indexOf("MicroPython v")
      this.pty.write(content.substring(micropythonIdx, content.length))

      return
    }

    // check if message is a special message
    if (content.startsWith("raw REPL; CTRL-B to exit")) {
      // set status to rawREPL
      this.status = SPortClientStatus.rawREPL
      this.pty.writeStatus("=== STATUS: rawREPL ===")

      return
    } else if (
      // this also excludes non RP2040 boards
      content.includes('with RP2040\r\nType "help()" for more information.')
    ) {
      // set status to normal REPL
      this.status = SPortClientStatus.normalREPL
      this.pty.writeStatus("=== STATUS: normalREPL ===")

      return
    } else if (content.startsWith("soft reboot")) {
      // soft reboot
      this.status = SPortClientStatus.softReboot
      this.pty.writeStatus("=== STATUS: soft reboot ===")

      return
    } else {
      // normal message
      this.pty.write(content)
    }
  }

  private async onUserInp(input: string): Promise<void> {
    this.pty.writeStatus(input.toString())
    if (this.status === SPortClientStatus.connecting) {
      // ignore
      return
    } else if (this.status === SPortClientStatus.disconnected) {
      // ignore
      return
    } else if (this.status === SPortClientStatus.softReboot) {
      // ignore
      return
    } else if (
      this.status === SPortClientStatus.normalREPL ||
      this.status === SPortClientStatus.rawREPL
    ) {
      /*if (input === "\x03") {
        // ctrl-c
        this.client.sendCtrlC()
      } else if (input === "\x04") {
        // ctrl-d
        this.client.sendCtrlD()
      }*/
      switch (input) {
        case ".exit":
          this.controllOps.softReset()
          this.client.disconnect()

          // exit
          this.pty.exit()
          break

        case ".softreboot":
          this.controllOps.softReboot()
          break
        default:
          // send input to client + \r\n because userInput only triggers after enter
          await this.client.send(input + "\r\n")
      }
    } else {
      throw new Error("Unknown status")
    }
  }
}
