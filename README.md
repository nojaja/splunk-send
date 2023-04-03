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


## Usage
```
node ./dist/index.bundle.js --url http://localhost:8088/services/collector --token <token> --file ./test.csv
```
