import log4js from 'log4js';
import OutputStream from './OutputStream.js';
import request from 'request-stream';
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
const logger = log4js.getLogger('loader/SplunkOutputStream.js');
logger.level = 'all'; // Set the desired log level


class SplunkOutputStream extends OutputStream {
    // コンストラクタでSplunk HECのURLとトークンを受け取る
    constructor(filePath, options) {
        super(filePath, options);
        this.postStream = null;
        this.url = options.url;
        this.proxy = options.proxy;
        this.token = options.token;
        this.channel = options.channel;
        this.outputFile = filePath;
        if (this.debug) logger.info(`SplunkOutputStream: ${JSON.stringify(this)}`);
    }

    async open(outputFile) {
        this.outputFile = outputFile;
        // POSTリクエストのオプションを設定
        const postOptions = {
            url: this.url, // Splunk HECのURL
            headers: {
                Authorization: `Splunk ${this.token}`, // Splunk HECのトークン
                Connection: 'close',
                'X-Splunk-Request-Channel': this.channel,
                'Content-Type': 'application/json'
            }
        };
        // proxyが文字列の場合のみセット
        if (typeof this.proxy === 'string' && this.proxy.length > 0) {
            postOptions.proxy = this.proxy;
        }
        // POSTリクエストを送るストリームを作成
        this.postStream = request.post(this.url, postOptions, (err, res, body) => {
            if (err) {
                logger.error(`SplunkOutputStream: Request error: ${err}`, err);
            }
        });
        this.postStream.on('finish', () => {
            logger.info('SplunkOutputStream: Finished writing to Splunk');
        });
        this.postStream.on('error', (error) => {
            logger.error(`SplunkOutputStream: Error writing to Splunk: ${error}`, error);
        });
        this.postStream.on('close', () => {
            logger.info('SplunkOutputStream: Connection closed');
        });
        this.postStream.on('data', (data) => {
            if (this.debug) logger.info(`SplunkOutputStream: Data received: ${data}`);
        });
        return true;
    }

    // 読み込んだデータをJSON形式に変換してEventMetadataを付与してPOSTリクエストに書き込む
    async write(data) {
        //送信バッファが履けるのを待つ
        const waitDrain = async (postStream) => {
            return new Promise((resolve) => {
                postStream.once('drain', resolve);
            });
        }
        if (this.debug) logger.info(`SplunkOutputStream.write: ${data}`);
        if (!await this.postStream.write(data)) {
            await waitDrain(this.postStream);
        }
    }

    async end() {
        if (this.postStream === null) return;
        const waitResponse = async (postStream) => {
            return new Promise((resolve) => {
                postStream.once('response', resolve);
            });
        }
        await this.postStream.end();
        const response = await waitResponse(this.postStream);
        if (response.statusCode === 200) {
            logger.info('SplunkOutputStream: Successfully wrote to Splunk');
        } else {
            logger.error(`SplunkOutputStream: Error writing to Splunk: ${response.statusCode}`);
            throw new Error(`SplunkOutputStream: Error writing to Splunk: ${response.statusCode}`, { cause: response });
        }
    }
    toString() {
        return `SplunkOutputStream: ${this.filePath}`;
    }
}
export default SplunkOutputStream;