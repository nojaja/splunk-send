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

class fileInfo {
    constructor(filePath) {
        this.originalfilePath = filePath;
        this.filePath = filePath;
    }
    getFilePath() {
        return this.filePath;
    }
    setFilePath(filePath) {
        this.filePath = filePath;
    }
    getOriginalFilePath() {
        return this.originalfilePath;
    }
    getExtName() {
        return path.extname(this.filePath);//ファイルの拡張子取得
    }
    getBaseName() {
        return path.basename(this.filePath, this.getExtName());//ファイル名取得
    }
    getDirName() {
        return path.dirname(this.filePath);//ファイルのディレクトリ名取得
    }
    getOriginalExtName() {
        return path.extname(this.originalfilePath);//ファイルの拡張子取得
    }
    getOriginalBaseName() {
        return path.basename(this.originalfilePath, this.getOriginalExtName());//ファイル名取得
    }
    size() {
        try {
            const stats = fs.statSync(this.filePath);
            return stats.size;
        } catch (error) {
            logger.error(`Error getting file size: ${this.filePath}`, error);
            throw error;
        }
    }
    rename(newFilePath) {
        try {
            fs.renameSync(this.filePath, newFilePath);
            this.filePath = newFilePath;
        } catch (error) {
            logger.error(`Error renaming file: ${this.filePath}`, error);
            throw error;
        }
    }
    lock() {
        const lockPath = this.originalfilePath + '.lock';
        try {
            fs.renameSync(this.originalfilePath, lockPath);
            this.filePath = lockPath;
        } catch (error) {
            logger.error(`Error locking file: ${this.originalfilePath}`, error);
            throw error;
        }
    }
    unlock() {
        const lockPath = this.originalfilePath + '.lock';
        try {
            if (fs.existsSync(lockPath)) {
                fs.renameSync(lockPath, this.originalfilePath);
            }
            this.filePath = this.originalfilePath;
        } catch (error) {
            logger.error(`Error unlocking file: ${this.originalfilePath}`, error);
            throw error;
        }
    }
    isLocked() {
        const lockPath = this.originalfilePath + '.lock';
        return fs.existsSync(lockPath);
    }
    clone() {
        const clone = new fileInfo(this.originalfilePath);
        clone.setFilePath(this.filePath);
        return clone;
    }
}

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
                //分割しつつJSONに変換して読み捨て、Errorが出たらretryする
                postStreamFactory = new OutputStreamFactory([RetryOutputStream, SplitOutputStream, JsonOutputStream, NullOutputStream], cliOptions, config);
            } else if (cliOptions['queue']) {
                config.outputDir = config.queueDir || './queue/';
                postStreamFactory = new OutputStreamFactory([SplitOutputStream, JsonOutputStream, FileOutputStream], cliOptions, config);
            } else if (cliOptions['rerun']) {
                //postStreamFactory = new OutputStreamFactory([RateControlStream, SplunkOutputStream], cliOptions, config);
                postStreamFactory = new OutputStreamFactory([RateControlStream, RetryOutputStream, SplunkOutputStream], cliOptions, config);
                //postStreamFactory = new OutputStreamFactory([RateControlStream, SplunkOutputStream], cliOptions, config);
            } else {
                //分割しつつJSONに変換してSplunkに送信、Errorが出たらretryする
                postStreamFactory = new OutputStreamFactory([RetryOutputStream, SplitOutputStream, JsonOutputStream, SplunkOutputStream], cliOptions, config);
            }
            let num = 1;
            await dirwalk(targetPath, Settings, async (filepath, settings) => {
                if (this.debug) logger.debug(`file: ${filepath}`);

                const fullpath = path.join(targetPath, filepath);//ファイルのフルパス取得
                const fileInfoObj = new fileInfo(fullpath);
                const filenum = num++;
                if (fileInfoObj.getExtName() === '.lock') return;

                logger.info(`[${filenum}] Processing file: ${fileInfoObj.getFilePath()} => splunk-ee`);
                const size = fileInfoObj.size();
                if (size > 0) {
                    logger.info(`[${filenum}] File size: ${Math.floor((size / 1024 / 1024) * 100) / 100} MB`);
                    // CSVファイルを読み込み、JSONに変換してSplunkにPOST送信メソッドを呼び出す
                    const postStream = postStreamFactory.getInstance(fileInfoObj);
                    try {
                        let isRetry = false;
                        do {
                            try {
                                if (cliOptions['rerun']) {
                                    await loadEvents.sendRaw(fileInfoObj, postStream);
                                } else {
                                    await loadEvents.sendCSV(fileInfoObj, postStream);
                                }
                            } catch (error) {
                                if (!error.isRetry) throw error;
                                isRetry = true;
                            }
                        } while (isRetry);
                    } catch (error) {
                        logger.error(`Error processing file: ${fullpath}`, error); // エラーハンドリング
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
            logger.error(`Error in LoadFiles.main: ${error.message}`, error); // エラーハンドリング
        }
    }
}

export default LoadFiles;