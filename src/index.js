import path from 'path';
import fs from 'fs';
import { Command } from 'commander';
import log4js from 'log4js';
import * as PathUtil from '@nojaja/pathutil';
import ConfigLoader from 'nodeconfigloder';
import LoadFiles from './loader/LoadFiles';
import 'source-map-support/register.js';

/*Logger設定 */
log4js.configure({
  appenders: {
    out: { type: 'stdout', layout: { type: 'pattern', pattern: '%[[%d] [%5p] [%h] [pid%z]%] %c %m' } }
  },
  categories: {
    default: { appenders: ['out'], level: 'all' }
  }
});
// Create a logger instance
const logger = log4js.getLogger('loader/index.js');
logger.level = 'all'; // Set the desired log level

/*初期値設定 */
const outputdir = './output';
const SettingsPath = path.join(__dirname, 'env.yaml');
const cryptokey = Buffer.from("1234567890123456", 'hex');
const version = (typeof __VERSION__ !== 'undefined') ? __VERSION__ : 'dev'; // __VERSION_はwebpackのDefinePluginによって書き換えられる
/*起動パラメータ */
const program = new Command();
program.version(version);
program
  .requiredOption('-c, --config <path>', 'config file path')
  .requiredOption('-i, --input <path>', 'input directory path')
  .option('-s, --sourcetype <string>', 'input sourcetype')
  .option('-t, --timestamp <yyyymmddhh>', 'overwrite timestamp')
  .option('-j, --jobsession <yyyymmddhh>', 'overwrite jobsession')
  .option('--ix --index <type>', 'select index')
  .option('-d, --debug', 'output extra debug information')
  .option('--queue <path>', 'queue output mode')
  .option('--rerun <path>', 'rerun mode')
  .option('--dry-run', 'null output mode');
program.parse(process.argv);
const cliOptions = program.opts();
if (cliOptions.debug) logger.info(cliOptions);

//設定ファイルの絶対パスを取得
const configPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(cliOptions.config ? cliOptions.config : SettingsPath)
);
//入力ファイルの絶対パスを取得
const inputPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(cliOptions.input)
);

if (cliOptions.config) logger.info(`Config - ${configPath}`);
logger.info(`Input file: ${inputPath}`);
if (cliOptions.sourcetype) logger.info(`Sourcetype - ${cliOptions.sourcetype}`);
//各種ファイルの存在チェック
if (cliOptions.config && !fs.existsSync(configPath)) {
  throw new Error(`Config file not found: ${configPath}`);
};

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

//動作確認時用のwait処理
//index.js以外で定義すると動作しないので、これを利用すること
global._wait = ms => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const main = async () => {
  const startTime = process.hrtime();
  process.on('exit', exitCode => {
    // 後始末処理
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
    logger.info(`process statistics - Execution time: ${endTimeArray[0]}s ${endTimeArray[1] / 1000000}ms, memoryUsage: ${_memoryUsage}`);
  });
  //設定ファイルの読み込み
  const configLoder = new ConfigLoader(cryptokey);
  const config = JSON.parse(await configLoder.readConfigSync(configPath));
  if (cliOptions.jobsession) {
    logger.info(`Jobsession - ${cliOptions.jobsession}`);
    config['jobsession'] = cliOptions.jobsession;
  }
  if (cliOptions.timestamp) {
    logger.info(`Timestamp - ${cliOptions.timestamp}`);
    config['timestamp'] = cliOptions.timestamp;
  }
  if (cliOptions.index) {
    logger.info(`Index - ${cliOptions.index}`);
    config['index'] = cliOptions.index;
  }
  if (cliOptions.queue) {
    //入力先の絶対パス取得
    const outputPath = PathUtil.normalizeSeparator(
      PathUtil.absolutePath(cliOptions.queue)
    );
    logger.info(`Queue - ${outputPath}`);
    config['outputDir'] = outputPath;
  }
  if (cliOptions.rerun) {
    //入力先の絶対パス取得
    const completedDir = PathUtil.normalizeSeparator(
      PathUtil.absolutePath(cliOptions.rerun)
    );
    logger.info(`rerun - ${completedDir}`);
    config['completedDir'] = completedDir;
  }
  if (cliOptions.dryRun) {
    logger.info(`dry-run - null output mode`);
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