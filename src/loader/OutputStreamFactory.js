import * as os from 'os';
import * as uuid from 'node-uuid';
import log4js from 'log4js';
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
const logger = log4js.getLogger('loader/OutputStreamFactory.js');
logger.level = 'all'; // Set the desired log level


class OutputStreamFactory {
    constructor(OutputStreams, cliOptions, config) {
        this.OutputStreams = OutputStreams;
        this.options = Object.assign({}, config, {
            url: config.url,
            proxy: config.proxy,
            token: config.token,
            channel: config.channel || uuid.v4(),
            debug: config.debug || false,
            outputdir: config.outputdir || './output',
            eventMetadata: {
                time: config.time || new Date().getTime(),
                host: os.hostname(),
                source: config.source || 'default',
                sourcetype: cliOptions.sourcetype || 'test'
            }
        })
        if(cliOptions.index) {
            this.options.eventMetadata.index = cliOptions.index;
        }
    }

    getOutputStreamsNameList() {
        const names = this.OutputStreams.map((cls) => {
            return cls.toString();
        });
        return names;
    }
    getInstance(filePath) {
        const _getInstance = (filePath,outputStreams,rootCls) => {
            const Cls = outputStreams.shift();
            if (!Cls) return null;
            const instance = new Cls(filePath,this.options);
            instance.rootCls = (rootCls) ? rootCls : instance;
            instance.chainCls = _getInstance(filePath, outputStreams, instance.rootCls);
            return instance;
        }
        return _getInstance(filePath, Array.from(this.OutputStreams));
    }
}
export default OutputStreamFactory;