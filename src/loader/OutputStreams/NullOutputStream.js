import log4js from 'log4js';
import OutputStream from './OutputStream.js';
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
const logger = log4js.getLogger('loader/NullOutputStream.js');
logger.level = 'all'; // Set the desired log level


class NullOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
    }

    async open(outputFile) {
        logger.info(`NullOutputStream.open: ${this.filePath}`);
        return true;
    }

    async write(data) {
        logger.info(`NullOutputStream.write: ${JSON.stringify(data)}`);
        return true;
    }

    async end() {
        logger.info(`NullOutputStream.end: ${this.filePath}`);
        return true;
    }
    toString() {
        return `NullOutputStream: ${this.filePath}`;
    }
}
export default NullOutputStream;