// csvライブラリをインポート
import * as csv from 'csv';
import os from 'os';
import * as uuid from 'node-uuid';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import http from 'http';

// fetchでkeepAliveするためのエージェント作成
const keepAliveAgent = new http.Agent ({ keepAlive: true });  

// SplunkSend
export class SplunkSend {
    // コンストラクタでSplunk HECのURLとトークンを受け取る
    constructor(url, token, option = {}) {
        this.url = url; // Splunk HECのURL ex.http://mysplunk/services/collector
        this.token = token;// Splunk HECのトークン
        this.proxy = option.proxy || "";
        this.channel = option.channel || uuid.v4();
        this.time = option.time || new Date().getTime();
        this.hostname = os.hostname();
        this.source = option.source || "";
    }

    // sendCSVメソッドを書き直す
    // Promiseを返すように変更
    sendCSV(filepath, sourcetype) {

    // Event Metadataを設定
        const eventMetadata = {
            time: this.time,
            host: this.hostname,
            source: this.source,
            sourcetype: sourcetype
        }

        return new Promise((resolve, reject) => {
            // CSVファイルを読み込むストリームを作成
            const readStream = fs.createReadStream(filepath)
            .pipe(csv.parse())
            .on('data', (record) => {
              const jsonData = JSON.stringify(Object.assign(eventMetadata, { event: record }));
              fetch(this.url, {
                method: 'POST',
                headers: {
                  'Authorization': `Splunk ${this.token}`
                },
                body: jsonData,
                agent: keepAliveAgent
              })
                .then(response => {
                  console.log(response.status,response.statusText);
                  if(response.status=="200"){
                        resolve(response);
                    } else {
                        //console.log(response);
                        reject(response);
                    }
                })
                .catch(error => {
                  reject(error);
                });
            })
            .on('end', () => {
              console.log('CSV file successfully processed.');
            });
        });
    }
}
export default SplunkSend
