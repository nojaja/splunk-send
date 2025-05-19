import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
import OutputStream from './OutputStream.js';
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
const logger = log4js.getLogger('loader/RateControlStream.js');
logger.level = 'all'; // Set the desired log level


class RateControlStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.size = 0;
        this.ratelimitSize = options.ratelimitSize || 10 * 1024 * 1024; // 10MB
        this.fileNumber = 0;

        const formatDate = current_datetime => {
            if (Number.isNaN(current_datetime.getTime())) return "";
            return `${current_datetime.getFullYear()}${(
                "00" + String(current_datetime.getMonth() + 1)).slice(-2)}${"00" + String(current_datetime.getDate()).slice(-2)}`;
        };
        const today = new Date();
        const timestamp = formatDate(today);
        this.completeDir = path.join(
            options.completeDir || "./completeDir",
            timestamp);
        fs.mkdirSync(this.completeDir, { recursive: true });
    }

    async open(outputFile) {
        try {
            this.size = 0;
            this.fileNumber++;
            const totalSize = this.getTotalFileSizeSync(this.completeDir);
            const size = outputFile.size();
            if (this.debug) logger.info(`RateControlStream.open: ${outputFile.getFilePath()} size: ${size} totalSize: ${totalSize}`);
            if (this.ratelimitSize > totalSize + size) {
                return await this.chainCls.open(outputFile);
            } else {
                logger.info(`RateControlStream.open: ${outputFile.getFilePath()} size: ${size} totalSize: ${totalSize}`);
            }
        } catch (error) {
            console.error(`RateControlStream.open: ${error.message}`);
        }
        return false;
    }

    async write(data) {
        if (this.chainCls) return await this.chainCls.write(data);
    }

    async checkpoint() {
        if (this.chainCls) await this.chainCls.checkpoint();
    }

    async end() {
        try {
            if (this.chainCls) await this.chainCls.end();
            const outputFile2 = path.join(this.completeDir, (this.filePath.getOriginalBaseName() + this.filePath.getOriginalExtName()));
            this.filePath.rename(outputFile2);
        } catch (error) {
            console.error(`RateControlStream.end: ${error.message}`);
        }
    }
    getTotalFileSizeSync(dir) {
        try {
            let totalSize = 0;
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            });
            return totalSize;
        } catch (error) {
            logger.error(`Error getting total file size: ${dir}`, error);
            throw error;

        }
    }
    toString() {
        return `FileOutputStream: ${this.filePath}`;
    }
}
export default RateControlStream;