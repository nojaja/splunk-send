# splunk-send
SplunkEE HEC CSV File Send Sample


## Install
```
npm install
```
```
npm run build
```

## test env
```
docker pull splunk/splunk

docker run -d -e "SPLUNK_START_ARGS=--accept-license" -e "SPLUNK_USER=root" -e "SPLUNK_PASSWORD=<pass>" -p "8000:8000" -p "8088:8088" --name splunk splunk/splunk

```
## token作成
```
[設定] » データ入力 » HTTPイベントコレクター » 新規トークン
http://localhost:8000/ja-JP/manager/launcher/http-eventcollector

```

## グローバル設定を編集
```
[設定] » データ入力 » HTTPイベントコレクター » グローバル設定を編集
http://localhost:8000/ja-JP/manager/launcher/http-eventcollector
SSLを有効にする チェック外す

```

## Usage
```
node ./dist/index.bundle.js --url http://localhost:8088/services/collector --token <token> --file ./test.csv
```

### SplunkSend2.js Request data sample
```
POST /services/collector HTTP/1.1
Authorization: Splunk XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
Connection: keep-alive
Host: localhost:8088
Transfer-Encoding: chunked

be
{"time":1680497260976,"host":"mypc","source":"SplunkSend","sourcetype":"splunkd_access","event":{"column01":"column01data1","column02":"column02data1","column03":"column03data1"}}
be
{"time":1680497260976,"host":"mypc","source":"SplunkSend","sourcetype":"splunkd_access","event":{"column01":"column01data2","column02":"column02data2","column03":"column03data3"}}
```
### SplunkSend2.js Response data sample
```
HTTP/1.1 200 OK
Date: Mon, 03 Apr 2023 04:49:12 GMT
Content-Type: application/json; charset=UTF-8
X-Content-Type-Options: nosniff
Content-Length: 27
Vary: Authorization
Connection: Close
X-Frame-Options: SAMEORIGIN
Server: Splunkd

{"text":"Success","code":0}
```