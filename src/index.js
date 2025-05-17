import path from 'path';
import fs from 'fs';
import 'source-map-support/register.js';
import { Command } from 'commander';
import log4js from 'log4js';
import * as PathUtil from '@nojaja/pathutil';
import * as ConfigLoader from 'nodeconfigloder';
import LoadFiles from './loader/LoadFiles';


// Log4js configuration
log4js.configure({
  appenders: {
    out: { type: 'stdout', layout: { type: 'pattern', pattern: '%[[%d] [%5p] [%h] [%pid%z]%] %c %m' } }
  },
  categories: {
    default: { appenders: ['out'], level: 'all' }
  }
});
// Create a logger instance
const logger = log4js.getLogger('loader/index.js');
logger.level = 'all'; // Set the desired log level

/**初期設定 */
const outputdir = './output';
const SettingsPath = path.join(__dirname, 'env.yaml');
const cryptokey = Buffer.from("1234567890123456", 'hex');
const version = (typeof __VERSION__ !== 'undefined') ? __VERSION__ : 'dev';
/**起動パラメータ */
const program = new Command();
program.version(version);
program
  .requiredOption('-c, --config <path>', 'config file path')
  .requiredOption('-i, --input <path>', 'input file path')
  .option('-s, --sourcetype <string>', 'sourcetype key')
  .option('-t, --timestamp <yyyymmddhh>', 'set timestamp')
  .option('-j, --jobsession <yyyymmddhh>', 'set jobsession')
  .option('--ix --index <type>', 'select index')
  .option('-d, --debug', 'Enable debug mode')
  .option('--queue', 'queue mode')
  .option('--rerun', 'rerun mode')
  .option('--dry-run', 'dry-run mode');
program.parse(process.argv);
const cliOptions = program.opts();
if (cliOptions.debug) logger.info(cliOptions);

const configPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(cliOptions.config ? cliOptions.config : SettingsPath)
);

const inputPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(cliOptions.input)
);

if (cliOptions.config) logger.info(`Config file: ${configPath}`);
logger.info(`Input file: ${inputPath}`);
if (cliOptions.sourcetype) logger.info(`Sourcetype: ${cliOptions.sourcetype}`);

if (cliOptions.config && !fs.existsSync(configPath)) {
  throw new Error(`Config file not found: ${configPath}`);
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

global._wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const main = async () => {
  const startTime = process.hrtime();
  process.on('exit', exitCode => {
    //後始末処理
    const endTimeArray = process.hrtime(startTime);
    const memoryUsage = process.memoryUsage();
    function toMByte(byte) {
      return `${Math.floor((byte / 1024 / 1024) * 100) / 100}MB`
    }
    const _memoryUsage = JSON.stringify({
      "rss": toMByte(memoryUsage.rss),
      "heapTotal": toMByte(memoryUsage.heapTotal),
      "heapUsed": toMByte(memoryUsage.heapUsed),
      "external": toMByte(memoryUsage.external),
      "arrayBuffers": toMByte(memoryUsage.arrayBuffers)
    });
    console.log(`process statistics - Execution time: ${endTimeArray[0]}s ${endTimeArray[1] / 1000000}ms, memoryUsage: ${_memoryUsage}`);
  });
  const configLoder = new ConfigLoader(cryptokey);
  const config = JSON.parse(await configLoder.readConfigSync(configPath));
  if (cliOptions.jobsession) {
    logger.info(`Job session: ${cliOptions.jobsession}`);
    config['jobsession'] = cliOptions.jobsession;
  }
  if (cliOptions.timestamp) {
    logger.info(`Timestamp: ${cliOptions.timestamp}`);
    config['timestamp'] = cliOptions.timestamp;
  }
  if (cliOptions.index) {
    logger.info(`Index: ${cliOptions.index}`);
    config['index'] = cliOptions.index;
  }

  try {
    const loadFiles = new LoadFiles(cliOptions.debug);
    await loadFiles.main(cliOptions, config, inputPath);
  } catch (error) {
    logger.error(`Error in main: ${error.message}`, error);
    process.exitCode = 1;
    return;
  }
};
await main();
