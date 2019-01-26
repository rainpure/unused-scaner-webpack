const path = require('path');
const chalk = require('chalk'); // Terminal string styling done right（命令行样式工具）
const { searchFiles } = require('./lib/utils'); // deglob: Take a list of glob patterns and return an array of file locations（获取文件位置）

// 由 webpack.config.js 传入的 options
function UnusedPlugin(options) {
  this.sourceDirectories = options.directories || [];
  this.exclude = options.exclude || [];
  this.root = options.root;
  this.failOnUnused = options.failOnUnused || false;
  this.useGitIgnore = options.useGitIgnore || true;
}

UnusedPlugin.prototype.apply = function apply(compiler) {
  const checkUnused = (compilation, callback) => {
    // Files used by Webpack during compilation
    // compilation.fileDependencies：模块中引入的源文件路径构成的数组
    const usedModules = Array.from(compilation.fileDependencies)
      .filter(file => this.sourceDirectories.some(dir => file.indexOf(dir) !== -1))
      .reduce(
        (obj, item) => Object.assign(obj, {
          [item]: true,
        }),
        {},
      );
    // Go through sourceDirectories to find all source files
    Promise.all(
      this.sourceDirectories.map(directory => searchFiles(directory, this.exclude, this.useGitIgnore)),
    )
      // Find unused source files
      .then(files => files.map(array => array.filter(file => !usedModules[file])))
      .then(display.bind(this))
      .then(continueOrFail.bind(this, this.failOnUnused, compilation))
      .then(callback);
  };
  // webpack 4
  if (compiler.hooks && compiler.hooks.emit) {
    compiler.hooks.emit.tapAsync('UnusedPlugin', checkUnused);
    // webpack 3
  } else {
    compiler.plugin('emit', checkUnused);
  }
};

module.exports = UnusedPlugin;

function continueOrFail(failOnUnused, compilation, allFiles) {
  if (allFiles && allFiles.length > 0) {
    if (failOnUnused) {
      compilation.errors.push(new Error('Unused files found'));
    } else {
      compilation.warnings.push(new Error('Unused files found'));
    }
  }
}

function display(filesByDirectory) {
  const allFiles = filesByDirectory.reduce(
    (array, item) => array.concat(item),
    [],
  );
  if (!allFiles.length) {
    return [];
  }
  process.stdout.write('\n');
  process.stdout.write(chalk.green('\n*** Unused Plugin ***\n'));
  process.stdout.write(
    chalk.red(`${allFiles.length} unused source files found.\n`),
  );
  filesByDirectory.forEach((files, index) => {
    const directory = this.sourceDirectories[index];
    const relative = this.root
      ? path.relative(this.root, directory)
      : directory;
    process.stdout.write(chalk.blue(`\n● ${relative}\n`));
    files.forEach(file => process.stdout.write(
      chalk.yellow(`    • ${path.relative(directory, file)}\n`),
    ));
  });
  process.stdout.write(chalk.green('\n*** Unused Plugin ***\n\n'));

  return allFiles;
}
