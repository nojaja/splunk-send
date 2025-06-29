import fs from 'fs';
import log4js from 'log4js';
import * as csv from 'csv';
import * as readline from 'readline';

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
const logger = log4js.getLogger('loader/LoadEvents.js');
logger.level = 'all'; // Set the desired log level

export class LoadEvents {
    constructor(option = {}) {
        this.debug = option.debug || false;
        this.option = option;
    }

    async sendCSV(fileInfoObj, postStream) {
        try {
            fileInfoObj.lock();
            const csvReadStream = fs.createReadStream(fileInfoObj.getFilePath()).pipe(
                csv.parse({
                    columns: true,
                    skip_empty_lines: true,
                })
            );
            // finishイベントをPromise化
            const finishPromise = new Promise((resolve, reject) => {
                csvReadStream.on('finish', resolve);
                csvReadStream.on('error', reject);
            });
            csvReadStream.on('error', (error) => {
                logger.error(`Error reading CSV file: ${fileInfoObj.getFilePath()}`, error);
            });
            csvReadStream.on('finish', () => {
                logger.info(`Finished processing CSV file: ${fileInfoObj.getFilePath()}`);
            });
            if (await postStream.open(fileInfoObj)) {
                for await (const record of csvReadStream) {
                    if (this.debug) logger.debug(`record: ${JSON.stringify(record)}`);
                    await postStream.write(record);
                }
            }

            // for await終了後、finishイベントも待つ
            await finishPromise;
            csvReadStream.destroy();

            fileInfoObj.unlock();
            await postStream.end();

        } catch (error) {
            logger.error(`Error processing CSV file: ${fileInfoObj.getFilePath()}`, error);
            if (!error.isRetry) {
                logger.error(`Error processing CSV file: ${fileInfoObj.getFilePath()}`, error);
            }
            throw error;
        }
    }

    async sendJSON(fileInfoObj, postStream) {
        try {
            fileInfoObj.lock();

            const jsonReadStream = fs.createReadStream(fileInfoObj.getFilePath());
            const rl = readline.createInterface({ input: jsonReadStream, crlfDelay: Infinity });

            if (await postStream.open(filePath)) {
                for await (const line of rl) {
                    if (!line.trim()) continue;
                    let record;
                    try {
                        record = JSON.parse(line);
                    } catch (e) {
                        logger.error(`Invalid JSON line: ${line}`, e);
                        continue;
                    }
                    if (this.debug) logger.info(`record: ${JSON.stringify(record)}`);
                    await postStream.write(record);
                }
            }
            logger.info(`Finished processing JSON file: ${fileInfoObj.getFilePath()}`);
            rl.close();
            jsonReadStream.close();

            fileInfoObj.unlock();
            await postStream.end();
        } catch (error) {
            logger.error(`Error processing JSON file: ${fileInfoObj.getFilePath()}`, error);
            throw error;
        } finally {
            fileInfoObj.unlock();
        }
    }
    async sendRaw(fileInfoObj, postStream) {
        try {
            fileInfoObj.lock();
            const rawdataReadStream = fs.createReadStream(fileInfoObj.getFilePath());
            const rl = readline.createInterface({ input: rawdataReadStream, crlfDelay: Infinity });
            rawdataReadStream.on('error', (error) => {
                logger.error(`Error reading raw data file: ${fileInfoObj.getFilePath()}`, error);
            });
            rawdataReadStream.on('end', () => {
                logger.info(`Finished reading raw data file: ${fileInfoObj.getFilePath()}`);
            });
            rawdataReadStream.on('close', async () => {
                logger.info(`Closed raw data file: ${fileInfoObj.getFilePath()}`);
            });

            // finishイベントをPromise化
            const finishPromise = new Promise((resolve, reject) => {
                rawdataReadStream.on('close', resolve);
                rawdataReadStream.on('error', reject);
            });
            if (await postStream.open(fileInfoObj)) {
                for await (const line of rl) {
                    if (!line.trim()) continue;
                    if (this.debug) logger.info(`record: ${line}`);
                    await postStream.write(line);
                }
            }
            logger.info(`Finished processing JSON file: ${fileInfoObj.getFilePath()}`);
            rl.close();
            
            // for await終了後、finishイベントも待つ
            await finishPromise;
            if (!rawdataReadStream.closed) {
                rawdataReadStream.close(); // createReadStreamを閉じる
            }

            fileInfoObj.unlock(); //.lock拡張子を削除
            await postStream.end(); // postStreamを閉じる

        } catch (error) {
            logger.error(`Error processing JSON file: ${fileInfoObj.getFilePath()}`, error);
            throw error;
        }
    }
}
export default LoadEvents;