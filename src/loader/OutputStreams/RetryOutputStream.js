import log4js from 'log4js';
import OutputStream from './OutputStream.js';
import { setTimeout } from 'timers/promises';
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
const logger = log4js.getLogger('loader/RetryOutputStream.js');
logger.level = 'all'; // Set the desired log level


class RetryOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.lineCount = 0;
        this.lastLine = 1;
        this.retryCount = 0;
        this.retrylimit = options.retrylimit || 3;
        this.retrywait = options.retrywait || 1000;
        this.outputFile = null;
    }

    async retry(error) {
        this.lineCount = 0;
        this.retryCount++;
        error.isRetry = (this.retryCount < this.retrylimit);
        logger.error(`RetryOutputStream.retry: ${this.retryCount}/${this.retrylimit} lastLine: ${this.lastLine} error: ${error.message} file: ${this.filePath}`);
        await setTimeout(this.retrywait * this.retryCount);
        throw error;
    }

    async open(outputFile) {
        this.filePath = outputFile;
        try {
            if (this.chainCls) return await this.chainCls.open(outputFile);
        } catch (error) {
            return await this.retry(error);
        }
    }

    async write(data) {
        this.lineCount++;
        if (this.lineCount >= this.lastLine) {
            try {
                if (this.chainCls) return await this.chainCls.write(data);
            } catch (error) {
                await this.retry(error);
            }
        }
    }
    async checkpoint() {
        this.lastLine = this.lineCount + 1;
        if(this.chainCls)await this.chainCls.checkpoint();
    }

    async end() {
        try {
            if(this.chainCls) await this.chainCls.end();
        } catch (error) {
            await this.retry(error);
        }
    }
    toString() {
        return `FileOutputStream: ${this.filePath}`;
    }
}
export default RetryOutputStream;