// csvライブラリをインポート
import * as csv from 'csv';
import os from 'os';
import * as uuid from 'node-uuid';

// requestモジュールをインポート
import request from 'request-stream';
import fs from 'fs';
import path from 'path';

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
        this.source = option.source || "SplunkSend";
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
            const csvReadStream = fs.createReadStream(filepath).pipe(csv.parse({
                columns: true
            }))

            // POSTリクエストのオプションを設定
            const postOptions = {
                url: this.url, // Splunk HECのURL
                headers: {
                    'Authorization': `Splunk ${this.token}`, // Splunk HECのトークン
                    'Connection': 'keep-alive'
                }
            };

            // POSTリクエストを送るストリームを作成
            const postStream = request.post(this.url, postOptions, () => {});

            postStream.on('finish', () => {
                console.log("postStream finish", 'CSVファイルの送信が完了しました');
            });
            postStream.on('error', (error) => {
                console.error("error", error);
                reject(error); // POSTリクエストが失敗したらrejectする
            });
            postStream.on('response', (response) => {
                console.log("response", response.statusCode, response.statusMessage);
                if (response.statusCode == 200) {
                    resolve(response); 
                } else {
                    //console.log(response);
                    reject(response); 
                }
            });
            postStream.on('data', (data) => {
                console.log("data", data);
            });
            postStream.on('close', () => {
                console.log("close");
            });

            // 読み込んだデータをJSONに変換してEvent Metadataを付与してPOSTリクエストに書き込む
            csvReadStream.on('data', (record) => {
                const senddata = JSON.stringify(Object.assign(eventMetadata, { event: record }));
                console.log(senddata)
                postStream.write(senddata)
            });
            csvReadStream.on('finish', (data) => {
                console.log("csvReadStream finish", 'CSVファイルの読み込みが完了しました');
                postStream.end();
            });

        });
    }

    // sendJsonメソッドを書き直す
    // Promiseを返すように変更
    sendJson(jsonData, eventMetadata) {
        return new Promise((resolve, reject) => {
            // POSTリクエストのオプションを設定
            const postOptions = {
                url: this.url, // Splunk HECのURL
                headers: {
                    'Authorization': `Splunk ${this.token}` // Splunk HECのトークン
                }
            };

            // POSTリクエストを送るストリームを作成
            const postStream = request.post(postOptions);

            // 配列に入ったJSONデータをEvent Metadataを付与してPOSTリクエストにパイプする
            jsonData.forEach((record) => {
                postStream.write(JSON.stringify(Object.assign(eventMetadata, record)));
            });
            postStream.on('end', () => {
                resolve('JSONデータの送信が完了しました'); // POSTリクエストが成功したらresolveする
            });
            postStream.on('error', (err) => {
                reject(err); // POSTリクエストが失敗したらrejectする
            });
        });
    }
}
export default SplunkSend
