const LL_ERROR = "error"
const LL_WARN = "warn"
const LL_INFO = "info"
const LL_DEBUG = "debug"

function logLevelToNumber(level: string): number {
  switch (level) {
    case LL_ERROR:
      return 0
    case LL_WARN:
      return 1
    case LL_INFO:
      return 2
    case LL_DEBUG:
      return 3
    default:
      return -1
  }
}

/**
 * Levels:
 * - error
 * - warn
 * - info
 * - debug
 */
const LOG_LEVEL = process.env.LOG_LEVEL || LL_ERROR

function doLog(message: string, level: string): void {
  const logLvl = logLevelToNumber(LOG_LEVEL)
  const msgLvl = logLevelToNumber(level)
  if (logLvl === -1 || msgLvl === -1) {
    return
  }

  if (msgLvl <= logLvl) {
    switch (level) {
      case LL_ERROR:
        console.error(message)
        break
      case LL_WARN:
        console.warn(message)
        break
      case LL_INFO:
        console.log(message)
        break
      case LL_DEBUG:
        console.debug(message)
        break
      default:
        return
    }
  }
}

function lerr(message: string): void {
  doLog(message, LL_ERROR)
}

function lwarn(message: string): void {
  doLog(message, LL_WARN)
}

function linfo(message: string): void {
  doLog(message, LL_INFO)
}

function ldbg(message: string): void {
  doLog(message, LL_DEBUG)
}

export { lerr, lwarn, linfo, ldbg }
