import log4js from 'log4js';
import * as csv from 'csv';
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
const logger = log4js.getLogger('loader/CsvOutputStream.js');
logger.level = 'all'; // Set the desired log level


class CsvOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.postStream = null;
        this.eventMetadata = options.eventMetadata;
    }

    async open(outputFile) {
        if(this.chainCls)await this.chainCls.open(outputFile);
        this.postStream = csv.stringify({
            header: true
        });
        this.postStream.on('data', async(chunk) => {
            if(this.chainCls)await this.chainCls.write(chunk.toString());
        });
        this.postStream.on('finish', () => {});
        this.postStream.on('error', (err) => {
            logger.error(`Error in CsvOutputStream: ${err}`);
        });
        return true;
    }

    async write(data) {
        const recode = Object.assign(this.eventMetadata, data);
        if(this.debug) logger.info(`CsvOutputStream.write: ${JSON.stringify(recode)}`);
        return await this.postStream.write(recode);
    }

    async end() {
        await this.postStream.end();
        if(this.chainCls)await this.chainCls.end();
    }
    toString() {
        return `CsvOutputStream: ${this.filePath}`;
    }
}
export default CsvOutputStream;