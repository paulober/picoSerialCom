/* eslint-disable @typescript-eslint/no-unused-vars */
import { PicoSerialCom } from "index"

/* Custom designed test structure to test functionality not to find bugs like unit tests */

const delay = (ms: number): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// colors
const FG_RED = 31
const FG_GREEN = 32
const FG_YELLOW = 33
const FG_BLUE = 34
const FG_MAGENTA = 35
const FG_CYAN = 36
const FG_WHITE = 37
const BG_RED = 41
const BG_GREEN = 42
const BG_YELLOW = 43
const BG_BLUE = 44
const BG_MAGENTA = 45
const BG_CYAN = 46
const BG_WHITE = 47

// logger
const pl = (msg: string, color: number): void =>
  console.log(`\x1b[${color}m${msg}\x1b[0m`)

// test
const doTest = async function (): Promise<void> {
  const picoSerialCom = new PicoSerialCom((message: Buffer) => {
    console.log(message.toString("utf-8"))
  })
  await picoSerialCom.connect(
    (err: Error) => {
      pl("Timeout", BG_RED)
    },
    () => {
      pl("Connected - Waiting for 2 sconds", FG_CYAN)
    }
  )

  await delay(2 * 1000) // wait 2 seconds

  picoSerialCom.disconnect()
  pl("Disconnected", FG_CYAN)
}

// main
;(async () => {
  pl("Starting custom test", BG_GREEN)

  try {
    await doTest()
  } catch (err) {
    console.log(err)
  }

  pl("Custom test finished!", BG_GREEN)
})()
