import { DelimiterParser, SerialPort } from "serialport"
import { ldbg, lerr, lwarn } from "./logger"
//import * as util from "util"

const CTRL_A = "\x01" // raw repl
const CTRL_B = "\x02" // exit raw repl
const CTRL_C = "\x03" // ctrl-c
const CTRL_D = "\x04" // reset (ctrl-d) / exit paste mode
const CTRL_E = "\x05" // paste mode (ctrl-e)
const CTRL_F = "\x06" // safe boot (ctrl-f)

/**
 * Default frequent Pico (w) board serial port manufacturer values.
 */
export const DEFAULT_MANUFACTURERS = ["MicroPython", "Microsoft"]

/**
 * A serialport client wrapper for communicating with the MicroPython REPL on
 * a Raspberry Pi Pico (W) board.
 */
export class PicoSerialCom {
  /**
   * The serialport client instance.
   */
  private stream?: SerialPort
  /**
   * List of autoconnect manufacturers. When autoconnecting, only ports with a manufacturer
   * in this list will be considered with priority form 0 as first and the up.
   *
   * @type {string[]}
   * @default ["MicroPython", "Microsoft"]
   */
  private manufacturers: string[]
  /**
   * @readonly Currently, overwriting the vendorIds is not supported.
   * @type {string[]}
   * @default
   */
  private readonly vendorIds: string[] = ["2E8A"]
  /**
   * @readonly Currently, overwriting the productIds is not supported.
   * @type {string[]}
   * @default
   */
  private readonly productIds: string[] = ["0005"]
  /**
   * Connects to the specified serial port on `connect()`.
   * If no manualComAddress is set, the autoConnect() function will be used.
   *
   * @type {string}
   * @default [""]
   */
  private manualComAddress: string

  /* Runtime properties */
  private isErrorThrown: boolean = false
  private onMessage: (message: Buffer) => void
  private safeBootOnConnect: boolean

  /**
   * A serialport client wrapper for communicating with the MicroPython REPL on
   * a Raspberry Pi Pico (W) board.
   *
   * @param {string} manualComAddress A manual serial port address. If set, the `autoConnect()`
   * function will not be used to calculate the port address.
   * @param {string[]} manufacturers Will overwrite default manufacturers list.
   */
  constructor(
    cbOnMessage: (message: Buffer) => void,
    manualComAddress?: string,
    manufacturers?: string[],
    softResetOnConnect?: boolean
  ) {
    this.manualComAddress = manualComAddress || ""
    this.manufacturers = manufacturers || DEFAULT_MANUFACTURERS
    this.onMessage = cbOnMessage
    this.safeBootOnConnect = softResetOnConnect || false
  }

  /**
   * Querys the serial ports and returns the port with the highest priority. The priority
   * is calculated by the sume of the ranking for each category,
   * `productIds` > `vendorIds` > `manufacturers`. It will return undefined if no
   * suitable port was found.
   *
   * @returns The path to the serial port.
   */
  private async autoConnect(): Promise<string | undefined> {
    const ports = await SerialPort.list()

    //search ports by productIds
    const productPorts = ports.filter((port) =>
      port.productId !== undefined
        ? this.productIds.includes(port.productId)
        : false
    )

    if (productPorts.length > 0) {
      if (productPorts.length > 1) {
        let portsWithValues = productPorts.map((port) => {
          // cal value
          let value = 0

          if (
            port.vendorId !== undefined &&
            this.vendorIds.includes(port.vendorId)
          ) {
            value +=
              this.vendorIds.length - this.vendorIds.indexOf(port.vendorId)
          }

          if (
            port.manufacturer !== undefined &&
            this.manufacturers.includes(port.manufacturer)
          ) {
            value +=
              this.manufacturers.length -
              this.manufacturers.indexOf(port.manufacturer)
          }

          return {
            portPath: port.path,
            value,
          }
        })

        portsWithValues.sort((a, b) => a.value - b.value)

        return portsWithValues[-1].portPath
      } else {
        return productPorts[0].path
      }
    }

    //search ports by vendorIds
    const vendorPorts = ports.filter((port) =>
      port.vendorId !== undefined
        ? this.vendorIds.includes(port.vendorId)
        : false
    )

    if (vendorPorts.length > 0) {
      if (vendorPorts.length > 1) {
        let portsWithValues = vendorPorts.map((port) => {
          // cal value
          let value = 0

          if (
            port.productId !== undefined &&
            this.productIds.includes(port.productId)
          ) {
            value +=
              this.productIds.length - this.productIds.indexOf(port.productId)
          }

          if (
            port.manufacturer !== undefined &&
            this.manufacturers.includes(port.manufacturer)
          ) {
            value +=
              this.manufacturers.length -
              this.manufacturers.indexOf(port.manufacturer)
          }

          return {
            portPath: port.path,
            value,
          }
        })

        portsWithValues.sort((a, b) => a.value - b.value)

        return portsWithValues[-1].portPath
      } else {
        return productPorts[0].path
      }
    }

    // search ports by manufaturers
    for (const manufacturer of this.manufacturers) {
      for (const port of ports) {
        // returns first port with a manufacturer in the acManufacturers list as
        // the acManufacturers list is sorted by priority descending
        if (port.manufacturer === manufacturer) {
          return port.path
        }
      }
    }

    return undefined
  }

  /**
   * Initialises a serialport client.
   *
   * @param autoOpen Auto opens the connection on client initialisation.
   * @throws Throws an error if the connection could not be opened or no
   * suitable serial port could be found.
   */
  public async connect(
    cbOnTimeout: (err: Error) => void,
    cbOnConnect: () => void
  ): Promise<void> {
    // return if stream is already open
    if (this.stream?.isOpen) {
      return
    }

    // if manualComAddress is set, use it, else use autoConnect() to find a port
    const address: string | undefined =
      this.manualComAddress || (await this.autoConnect())
    if (address === undefined) {
      const errMsg = "No serial port available"
      lwarn(errMsg)
      throw new Error(errMsg)
    }

    // init serialport client
    this.stream = new SerialPort(
      {
        baudRate: 115200, // Baudrate of the serial connection,
        autoOpen: false,
        // Path to the serial port. If not set, the autoConnect() function will be used.
        path: address,
      },
      (err) => {
        if (err !== null) {
          err.message = `Could not open serial port connection: ${err.message}`
          throw err
        }
      }
    )

    ldbg("Trying to connect to serial port " + address)

    let timeout = setTimeout(async () => {
      if (!this.isErrorThrown) {
        this.isErrorThrown = true
        cbOnTimeout(new Error("Timeout while connecting"))
        this.disconnect()
      }
    }, 2000)

    /* Attach listeners */
    this.stream.on("error", (err) => {
      lerr("Serial port stream error: " + err.message)
      if (err !== undefined && err !== null && !this.isErrorThrown) {
        this.isErrorThrown = true // Prevents multiple error messages
        throw err
      }
    })

    // TODO: maybe use this.stream?.unpipe() if not in normal repl mode
    /*this.stream.pipe(
      new DelimiterParser({
        delimiter: Buffer.from("\r\n>>> "),
        includeDelimiter: false,
      })
    )*/

    this.stream.on("data", (message: Buffer) => this.onData(message))

    /* Configure stream */
    this.stream.open((err) => {
      if (err !== null) {
        throw new Error("Could not open serial port connection")
      }
    })
    this.stream.prependOnceListener("open", () => {
      this.sendPing()
      clearTimeout(timeout)

      if (this.safeBootOnConnect) {
        // double CTRL_C to exit every program, CTRL_B to enter normal repl
        this.send("\r" + CTRL_C + CTRL_C + CTRL_B)
      } else {
        // to get repl promt back
        this.send("\r\n")
      }

      ldbg("Serial port connection established")
      cbOnConnect()
    })
  }

  public send(message: string): void {
    if (this.stream?.isOpen) {
      let data = Buffer.from(message, "binary")
      if (
        !this.stream.write(data, (err) => {
          if (err !== undefined && err !== null) {
            lerr("Error while writing to serial port: " + err.message)
          }
        })
      ) {
        // TODO: maybe cause problems with some control
        // commands like machine.reset() which will reastart the target
        this.stream?.drain()
      }
    }
  }

  public sendPing(): void {
    if (this.stream !== undefined && !this.stream.isOpen) {
      return
    }

    if (process.platform === "win32") {
      // avoid MCU waiting in bootloader on hardware restart by setting both dtr and rts high
      this.stream?.set({
        rts: true,
      })
    }

    if (process.platform === "darwin") {
      this.stream?.set({
        dtr: true,
      })
    }
  }

  public onData(data: Buffer): void {
    const msg = data.toString("utf8")
    ldbg("Received data from serial port: " + msg)
    this.onMessage(data)
  }

  /**
   * Closes the serialport connection.
   *
   * @throws Throws an error if the connection could not be closed.
   */
  public disconnect(): void {
    if (this.stream?.isOpen) {
      this.stream.close((err) => {
        if (err !== null) {
          lwarn("Could not close serial port connection")
        }
      })
    }
  }

  public flush(): void {
    if (this.stream?.isOpen) {
      this.stream.flush()
    }
  }
}
