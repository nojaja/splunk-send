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

    async sendCSV(filePath, postStream) {
        const lockPath = filePath + '.lock';
        try {
            fs.renameSync(filePath, lockPath);
            const csvReadStream = fs.createReadStream(lockPath).pipe(
                csv.parse({
                    columns: true,
                    skip_empty_lines: true,
                })
            );
            csvReadStream.on('error', (error) => {
                logger.error(`Error reading CSV file: ${filePath}`, error);
            });
            if (await postStream.open(filePath)) {
                for await (const record of csvReadStream) {
                    if (this.debug) logger.debug(`record: ${JSON.stringify(record)}`);
                    await postStream.write(record);
                }
            }
            csvReadStream.destroy();
            fs.renameSync(lockPath, filePath);
            await postStream.end();

            csvReadStream.on('finish', () => {
                logger.info(`Finished processing CSV file: ${filePath}`);
            });

        } catch (error) {
            logger.error(`Error processing CSV file: ${filePath}`, error);
            if (!error.isRetry) {
                logger.error(`Error processing CSV file: ${filePath}`, error);
            }
            throw error;

        } finally {
            if (fs.existsSync(lockPath)) {
                fs.renameSync(lockPath, filePath);
            }
        }
    }
    async sendJSON(filePath, postStream) {
        const lockPath = filePath + '.lock';
        try {
            fs.renameSync(filePath, lockPath);

            const jsonReadStream = fs.createReadStream(lockPath, { encoding: 'utf8' });
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
                fs.renameSync(lockPath, filePath);
                await postStream.end();
                logger.info(`Finished processing JSON file: ${filePath}`);
            }
            rl.close();
            jsonReadStream.close();
        } catch (error) {
            logger.error(`Error processing JSON file: ${filePath}`, error);
            throw error;
        } finally {
            if (fs.existsSync(lockPath)) {
                fs.renameSync(lockPath, filePath);
            }
        }
    }
    async sendRaw(filePath, postStream) {
        const lockPath = filePath + '.lock';
        try {
            fs.renameSync(filePath, lockPath);

            const rawdataReadStream = fs.createReadStream(lockPath, { encoding: 'utf8' });
            const rl = readline.createInterface({ input: rawdataReadStream, crlfDelay: Infinity });

            if (await postStream.open(filePath)) {
                for await (const line of rl) {
                    if (!line.trim()) continue;
                    if (this.debug) logger.info(`record: ${line}`);
                    await postStream.write(line);
                }
                fs.renameSync(lockPath, filePath);
                await postStream.end();
                logger.info(`Finished processing JSON file: ${filePath}`);
            }
            rl.close();
            rawdataReadStream.close();
        } catch (error) {
            logger.error(`Error processing JSON file: ${filePath}`, error);
            throw error;
        } finally {
            if (fs.existsSync(lockPath)) {
                fs.renameSync(lockPath, filePath);
            }
        }
    }
}
export default LoadEvents;