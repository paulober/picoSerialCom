// typical CTRL commands

/**
 * Raw REPL; CTRL-B to exit
 */
export const CTRL_A = "\x01"
/**
 * Exit raw REPL
 */
export const CTRL_B = "\x02"
/**
 * Smaller brother of Alt+F4 :)
 */
export const CTRL_C = "\x03"
/**
 * reset & exit paste mode / maybe also a EOF symbol
 */
export const CTRL_D = "\x04"
/**
 * Enter paste mode
 */
export const CTRL_E = "\x05"
/**
 * To a safe boot
 */
export const CTRL_F = "\x06" // safe boot (ctrl-f)

// ============ controll commands

/**
 * Do a soft reset thought MicroPython's machine API
 */
export const softyReset = "import machine;machine.soft_reset()"
/**
 * Do a soft reboot thought CTRL command
 */
export const softReboot = "\r" + CTRL_D
/**
 * Do a hard reset which reboot the board thought MicroPython's machine API
 */
export const softHardReset = "import machine;machine.reset()"
/**
 * Do a hard reboot thought CTRL command
 *
 * @deprecated Maybe not working as it has no reason to work
 */
export const hardReboot = "\r" + CTRL_F
