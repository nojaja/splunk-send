import fs from 'fs';
import log4js from 'log4js';
import * as csv from 'csv';
import * as readline from 'readline';
// Log4js configuration
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
            csvReadStream.on('error', (error) => {
                logger.error(`Error reading CSV file: ${fileInfoObj.getFilePath()}`, error);
            });
            csvReadStream.on('finish', async () => {
                logger.info(`Finished processing CSV file: ${fileInfoObj.getFilePath()}`);
                fileInfoObj.unlock();
                await postStream.end();
            });
            if (await postStream.open(fileInfoObj)) {
                for await (const record of csvReadStream) {
                    if (this.debug) logger.debug(`record: ${JSON.stringify(record)}`);
                    await postStream.write(record);
                }
            }
            csvReadStream.destroy();
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
            fileInfoObj.unlock();
            await postStream.end();
            logger.info(`Finished processing JSON file: ${fileInfoObj.getFilePath()}`);
            rl.close();
            jsonReadStream.close();
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
                fileInfoObj.unlock(); //.lock拡張子を削除
                await postStream.end(); // postStreamを閉じる
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
            rawdataReadStream.close(); // createReadStreamを閉じる
        } catch (error) {
            logger.error(`Error processing JSON file: ${fileInfoObj.getFilePath()}`, error);
            throw error;
        }
    }
}
export default LoadEvents;