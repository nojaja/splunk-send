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
        this.limitSize = options.limitSize || 10 * 1000 * 1000; // デフォルトは10MB
        this.fileNumber = 0;
    }

    async open(outputFile) {
        this.size = 0;
        this.fileNumber++;
        const extname = outputFile.getOriginalExtName();//ファイルの拡張子取得
        const basename = outputFile.getOriginalBaseName();//ファイル名取得
        const direname = outputFile.getDirName();//ファイルのディレクトリ取得
        const newFilePath = path.join(direname, `${basename}_${this.fileNumber}${extname}`);
        const outputInfo = outputFile.clone();
        outputInfo.setFilePath(newFilePath);
        logger.info(`FileOutputStream.open: ${newFilePath}`);
        return await this.chainCls.open(outputInfo);
    }

    async write(data) {
        const ret = await this.chainCls.write(data);
        this.size = this.size + Buffer.byteLength(Object.values(data).join(','), 'utf8');//データのサイズを計算
        if (this.size >= this.limitSize) {// サイズが制限を超えた場合、新しく出力先を用意する
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