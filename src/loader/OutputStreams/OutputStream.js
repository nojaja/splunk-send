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
    throw new Error("Method 'write' must be implemented.");
  }
  async checkPoint() {
    throw new Error("Method 'checkPoint' must be implemented.");
  }

  async end() {
    throw new Error("Method 'close' must be implemented.");
  }

  toString() {
    return `OutputStream: ${this.filePath}`;
  }

}
export default OutputStream;