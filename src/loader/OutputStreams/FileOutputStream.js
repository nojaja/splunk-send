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
const logger = log4js.getLogger('loader/FileOutputStream.js');
logger.level = 'all'; // Set the desired log level


class FileOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.postStream = null;
        this.outputDir = options.outputDir || './output';
    }

    async open(outputFile) {
        const extname = path.extname(outputFile.getFilePath());
        const basename = path.basename(outputFile.getFilePath(), extname);
        const _outputFile = `output_${basename}.csv`;
        fs.mkdirSync(this.outputDir, { recursive: true });
        this.postStream = fs.createWriteStream(path.join(this.outputDir, _outputFile));
        return true;
    }

    async write(data) {
        if (this.debug) logger.info(`FileOutputStream.write: ${data}`);
        return await this.postStream.write(data + "\n");
    }
    
    async checkpoint() {
        if (this.chainCls) await this.chainCls.checkpoint();
    }

    async end() {
        if (this.chainCls) await this.postStream.end();
    }
    toString() {
        return `FileOutputStream: ${this.filePath}`;
    }
}
export default FileOutputStream;