import * as os from 'os';
import * as uuid from 'node-uuid';
import log4js from 'log4js';

/*Logger設定 */
log4js.configure({
    appenders: {
        out: { type: 'stdout', layout: { type: 'pattern', pattern: '%[[%d] [%5p] [%h] [pid%z]%] %c %m' } }
    },
    categories: {
        default: { appenders: ['out'], level: 'all' }
    }
});
// Create a logger instance
const logger = log4js.getLogger('loader/OutputStreamFactory.js');
logger.level = 'all'; // Set the desired log level

class OutputStreamFactory {
    constructor(OutputStreams, cliOptions, config) {
        this.OutputStreams = OutputStreams;
        this.options = Object.assign({}, config, {
            url: config.url,
            proxy: config.proxy || '',
            token: config.token || '',
            channel: config.channel || uuid.v4(), //process毎のユニークなchannelを生成
            debug: config.debug || false,
            outputdir: config.outputdir || './output/',
            // Event Metadataを設定
            eventMetadata: {
                time: config.time || new Date().getTime(), //process毎で固定のタイムスタンプを設定
                host: os.hostname(), //Processのホスト名を設定
                source: config.source || 'default', //Process毎のsourceを設定
                sourcetype: cliOptions.sourcetype || 'test' //Process毎のsourcetypeを設定
            }
        })
        if (cliOptions.index) {
            this.options.eventMetadata.index = cliOptions.index;
        }
    }

    getOutputStreamsNameList() {
        const names = this.OutputStreams.map((cls) => {
            return cls.toString();
        });
        return names;
    }
    getInstance(fileInfoObj) {
        const _getInstance = (fileInfoObj, outputStreams, rootCls) => {
            const Cls = outputStreams.shift();
            if (!Cls) return null;
            const instance = new Cls(fileInfoObj, this.options);
            instance.rootCls = (rootCls) ? rootCls : instance;
            instance.chainCls = _getInstance(fileInfoObj, outputStreams, instance.rootCls);
            logger.info(`${instance.constructor.name} rootCls:${instance.rootCls.name} chainCls:${(instance.chainCls) ? instance.chainCls.constructor.name : ''}`);
            return instance;
        }
        return _getInstance(fileInfoObj, Array.from(this.OutputStreams));
    }
}
export default OutputStreamFactory;