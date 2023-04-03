import fs from "fs"
//const { Commander } = require('commander');
//import { commander } from 'Commander';
const commander = require('commander');
import { SplunkSend } from './SplunkSend2.js';
import path from 'path';


async function main(url,token,fileName) {
  try {
    // splunktestクラスのインスタンスを作成
    const splunk = new SplunkSend(url, token);

    // Event Metadataを設定
    const sourcetype = 'splunkd_access'; // ソースタイプ名
    // 配列に入ったJSONデータをPOSTするメソッドを呼び出す
    await splunk.sendCSV(fileName, sourcetype);

  } catch (err) {
    console.error("[main - error]",err);
  }
}

//const commander = new Commander();
commander
  .version('0.0.1')
  .requiredOption('-u, --url <url>', 'Splunk HEC URL ex.http://mysplunk:8088/services/collector')
  .requiredOption('-t, --token <string>', 'Splunk access token')
  .requiredOption('-f, --file <path>', 'File to upload')
  .parse(process.argv);

console.log(commander.opts())

const options = commander.opts();

main(options.url,options.token,options.file);
