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
const logger = log4js.getLogger('loader/JsonOutputStream.js');
logger.level = 'all'; // Set the desired log level


class JsonOutputStream extends OutputStream {
    constructor(filePath, options) {
        super(filePath, options);
        this.postStream = null;
        this.syncRecordTime = options.syncRecordTime || false;
        this.eventMetadata = options.eventMetadata;
        this.timestamp = options.timestamp || null;
        this.jobSession = options.jobSession || null;
    }

    async open(outputFile) {
        if(this.chainCls)return await this.chainCls.open(outputFile);
        return true
    }

    async write(data) {
        const gettime = () => {
            if (!data.timestamp)return this.eventMetadata.time;
            const yyyy = data.timestamp.substring(0, 4);
            const mm = data.timestamp.substring(4, 6);
            const dd = data.timestamp.substring(6, 8);
            const hh24 = data.timestamp.substring(8, 10);
            return new Date(yyyy, mm, dd, hh24).getTime();
        }
        const formatDate = current_datetime => {
            if (Number.isNaN(current_datetime.getTime())) return "";
            return `${current_datetime.getFullYear()}${(
                "00" + String(current_datetime.getMonth() + 1)).slice(-2)}${
                "00" + String(current_datetime.getDate()).slice(-2)}${
                "00" + String(current_datetime.getHours()).slice(-2)}`;
        };
        if(this.timestamp) data['timestamp'] = this.timestamp;
        data['jobSession'] = this.jobSession? this.jobSession : formatDate(new Date());
        const time = this.syncRecordTime ? gettime() : this.eventMetadata.time;
        const recode = JSON.stringify(Object.assign(this.eventMetadata, {time:time,event:data}));
        if(this.debug) logger.info(`JsonOutputStream.write: ${recode}`);
        if(this.chainCls)return await this.chainCls.write(recode);
    }

    async end() {
        if(this.chainCls)await this.chainCls.end();
    }
    toString() {
        return `JsonOutputStream: ${this.filePath}`;
    }
}
export default JsonOutputStream;