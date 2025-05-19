import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
import Dirwalk from '../common/Dirwalk';
import LoadEvents from './LoadEvents';
import OutputStreamFactory from './OutputStreamFactory';
import NullOutputStream from './OutputStreams/NullOutputStream';
import FileOutputStream from './OutputStreams/FileOutputStream';
import CsvOutputStream from './OutputStreams/CsvOutputStream';
import JsonOutputStream from './OutputStreams/JsonOutputStream';
import SplitOutputStream from './OutputStreams/SplitOutputStream';
import RetryOutputStream from './OutputStreams/RetryOutputStream';
import RateControlStream from './OutputStreams/RateControlStream';
import SplunkOutputStream from './OutputStreams/SplunkOutputStream';


/*Logger設定 */
const logger = log4js.getLogger('loader/LoadFiles.js');
logger.level = 'all'; // Set the desired log level

/*初期値設定 */
const Settings = {}

const _dirwalk = new Dirwalk(false);
const dirwalk = _dirwalk.dirwalk.bind(_dirwalk);

export class LoadFiles {
    constructor(debug = false) {
        this.debug = debug;
    }

    async main(cliOptions, config, targetPath) {
        try {
            const loadEvents = new LoadEvents(config);
            logger.info(`LoadFiles.main: ${targetPath}`);
            let postStreamFactory = null;
            if (cliOptions['dryRun']) {
                postStreamFactory = new OutputStreamFactory([RetryOutputStream, SplitOutputStream, JsonOutputStream, NullOutputStream], cliOptions, config);
            } else if (cliOptions['queue']) {
                config.outputDir = config.queueDir || './queue/';
                postStreamFactory = new OutputStreamFactory([RetryOutputStream, SplitOutputStream, JsonOutputStream, FileOutputStream], cliOptions, config);
            } else if (cliOptions['rerun']) {
                //postStreamFactory = new OutputStreamFactory([RateControlStream, SplunkOutputStream], cliOptions, config);
                postStreamFactory = new OutputStreamFactory([RateControlStream, SplunkOutputStream], cliOptions, config);
            } else {
                postStreamFactory = new OutputStreamFactory([RetryOutputStream, SplitOutputStream, JsonOutputStream, SplunkOutputStream], cliOptions, config);
            }
            let num = 1;
            await dirwalk(targetPath, Settings, async (filepath, settings) => {
                if (this.debug) logger.debug(`file: ${filepath}`);

                const fullpath = path.join(targetPath, filepath);//ファイルのフルパス取得
                const extname = path.extname(filepath);//ファイルの拡張子取得
                const basename = path.basename(filepath, extname);//ファイル名取得
                const filenum = num++;
                if (extname === '.lock') return;

                logger.info(`Processing file: ${filepath}`);
                const stats = fs.statSync(fullpath);
                if (stats.size > 0) {
                    logger.info(`File size: ${stats.size} bytes`);
                    const postStream = postStreamFactory.getInstance(fullpath);
                    try {
                        let isRetry = false;
                        do {
                            try {
                                if (cliOptions['rerun']) {
                                    await loadEvents.sendRaw(fullpath, postStream);
                                } else {
                                    await loadEvents.sendCSV(fullpath, postStream);
                                }
                            } catch (error) {
                                if (!error.isRetry) throw error;
                                isRetry = true;
                            }
                        } while (isRetry);
                    } catch (error) {
                        logger.error(`Error processing file: ${fullpath}`, error);
                    }
                } else {
                    logger.warn(`File is empty: ${fullpath}`);
                }
            }, (error) => {
                if (error.message.indexOf('no such file or directory') !== -1) {
                    logger.warn(`File not found: ${error.path}`);
                } else {
                    logger.error(`Error processing file: ${error.path}`, error);
                }
            });
        } catch (error) {
            logger.error(`Error in LoadFiles.main: ${error.message}`, error);
        }
    }
}

export default LoadFiles;