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
const logger = log4js.getLogger('loader/SplitOutputStream.js');
logger.level = 'all'; // Set the desired log level


class SplitOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.size = 0;
        this.limitSize = options.limitSize || 1000;
        this.fileNumber = 0;
    }

    async open(outputFile) {
        this.size = 0;
        this.fileNumber++;
        const extname = path.extname(outputFile.getFilePath());
        const basename = path.basename(outputFile.getFilePath(), extname);
        const _outputFile = `output_${basename}_${this.fileNumber}${extname}`;
        const outputInfo = outputFile.clone();
        outputInfo.setFilePath(_outputFile);
        logger.info(`FileOutputStream.open: ${_outputFile}`);
        return await this.chainCls.open(outputInfo);
    }

    async write(data) {
        const ret = await this.chainCls.write(data);
        this.size = this.size + Buffer.byteLength(Object.values(data).join(','), 'utf8');
        if (this.size >= this.limitSize) {
            await this.end();
            await this.rootCls.checkpoint();
            await this.open(this.filePath);
        }
        return ret;
    }

    async checkpoint() {
        if (this.chainCls) await this.chainCls.checkpoint();
    }

    async end() {
        if (this.chainCls) await this.chainCls.end();
    }
    toString() {
        return `FileOutputStream: ${this.filePath}`;
    }
}
export default SplitOutputStream;