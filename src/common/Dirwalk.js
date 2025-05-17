import * as fs from 'fs';
import * as path from 'path';
import log4js from 'log4js';
import * as PathUtil from '@nojaja/pathutil';

const logger = log4js.getLogger('loader/index.js');

export class Dirwalk {
    constructor(debug) {
        this.debug = debug;
        this.counter = 0;
    }
    /**
    * ディレクトリを再帰的に走査し、指定された拡張子を持つファイルのパスを取得する
    * @param {string} targetPath - 起点となるディレクトリのパス
    * @param {string} settings - 条件などが入った設定オブジェクト
    * @param {string} fileCallback(path, settings) - ファイル毎の処理するためのコールバック関数
    * @param {string} errCallback エラー発生時のコールバック関数
    * @returns
    */
    async dirwalk(targetPath, settings, fileCallback, errCallback) {
        this.counter = 0;
        const _settings = Object.assign({}, settings);
        return await this._dirwalk(targetPath, targetPath, _settings, fileCallback, errCallback);

    }

    async _dirwalk(targetPath, basePath, settings, fileCallback, errCallback) {
        try {
            const _settings = Object.assign({}, settings);
            const files = fs.readdirSync(targetPath);
            for (const file of files) {
                const filePath = PathUtil.normalizeSeparator(PathUtil.absolutePath(path.join(targetPath, file)));
                const stat = fs.statSync(filePath);
                if (stat.isSymbolicLink()) {
                    // シンボリックリンクは無視する
                    continue;
                }
                if (stat.isDirectory()) {
                    await this._dirwalk(filePath, basePath, _settings, fileCallback, errCallback);
                } else {
                    this.counter++;
                    if (this.debug) logger.debug(`file: ${filePath}`);
                    try {
                        await fileCallback(path.relative(basePath, filePath), _settings);
                    } catch (error) {
                        if (errCallback) {
                            errCallback(error);
                        } else {
                            logger.error(`Error processing file: ${filePath}`, error);
                        }
                    }
                }
            }
        } catch (error) {
            if (errCallback) {
                errCallback(error);
            } else {
                logger.error(`Error reading directory: ${targetPath}`, error);
            }
            return;

        }
    };
}

export default Dirwalk;
