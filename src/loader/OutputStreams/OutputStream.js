class OutputStream {
  constructor(filePath, options) {
    this.filePath = filePath;
    this.options = options;
    this.rootCls = null;
    this.chainCls = null;
    this.debug = options.debug || false;
  }

  async open(outputFile) {
    if (this.chainCls) return this.chainCls.open(outputFile);
  }

  async write(data) {
    if (this.chainCls) return this.chainCls.write(data);
  }
  
  async checkPoint() {
    if (this.chainCls) return this.chainCls.checkPoint();
  }

  async end() {
    if (this.chainCls) return this.chainCls.end();
  }

  toString() {
    return `OutputStream: ${this.filePath}`;
  }

}
export default OutputStream;