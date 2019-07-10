const cheerio = require('cheerio');
const childProcess = require('child_process');
const querystring = require('querystring');

const convertSync = (command) => childProcess.execSync(command);
const convertAsync = (command, cb) => childProcess.exec(
  command,
  { maxBuffer: 10 * 1024 * 1024 },
  cb
);

const getCellsOnly = (html) => cheerio.load(html)('#notebook-container').html();
const postProcess = (args, output) => {
  const source = args.cellsOnly ? getCellsOnly(output) : output;

  if (args.asString) {
    const json = JSON.stringify(source)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    return `export default ${json};`;
  }

  return source;
};

module.exports = function(content) {
  this.cacheable && this.cacheable(true);

  const override = querystring.parse(this.query.substring(1));
  override.cellsOnly = override.cellsOnly === 'true';
  const args = Object.assign({
    cellsOnly: false,
    asString: true,
    to: 'html'
  }, override);

  const command = `jupyter nbconvert --to ${args.to} "${this.resourcePath}" --stdout`;
  const callback = this.async();

  if (!callback) return postProcess(args, convertSync(command));

  convertAsync(command, (err, stdout, stderr) => {
    if (err) return callback(err);
    callback(null, postProcess(args, stdout));
  });
};
