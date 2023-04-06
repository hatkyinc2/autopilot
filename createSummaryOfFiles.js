const chalk = require('chalk');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const wordCount = require('word-count')
const { callGPT, calculateTokensCost } = require('./modules/gpt');
const ignoreList = process.env.IGNORE_LIST.split(',');
const fileExtensionsToProcess = process.env.FILE_EXTENSIONS_TO_PROCESS.split(',');
require('dotenv').config()

const calculateProjectSize = (dir) => {
  let projectSize = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && !ignoreList.includes(file)) {
      projectSize += calculateProjectSize(filePath);
    } else if (fileExtensionsToProcess.includes(path.extname(filePath))) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      projectSize += fileContent.length;
    }
  }

  return projectSize;
};


const processDirectory = async (dir, model) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && !ignoreList.includes(file)) {
      await processDirectory(filePath, model);
    } else if (fileExtensionsToProcess.includes(path.extname(filePath))) {
      const file = fs.readFileSync(filePath, 'utf8')
      console.log(filePath, wordCount(file)*1.33)
      if (wordCount(file)*1.33 > 3500) {
        console.log('File too BIG')
        continue
      }
      await processFile(filePath, model);
    }
  }
};

const processFile = async (filePath, model) => {
  try {
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    const prompt = `File:
\`\`\`
${fileContent}
\`\`\`
Task: Create a summary of this file, what it does and how it contributes to the overall project.
`
    const output = await callGPT(prompt, model)

    if (output) {
        // Save new comment
        const summaryPath = path.join(path.dirname(filePath), path.basename(filePath, '.js') + '.ai.txt');
        // adds filepath to top of summary
        const contentToRight = `File Path: ${filePath}\nSummary:\n${output}`
        fs.writeFileSync(summaryPath, contentToRight);
        const timestamp = new Date().toISOString();
        const hour = timestamp.match(/\d\d:\d\d/);

        console.log(`${hour}: Updated ${summaryPath}`);
    }
  } catch (error) {
    console.error(`Error processing file: ${filePath}`, error);
  }
};

async function main() {
  const options = yargs
  .option('dir', {
    alias: 'd',
    describe: 'The path to the directory containing the code files',
    default: process.env.CODE_DIR,
    type: 'string'
  })
  .option('all', {
    describe: 'Whether to perform a full analysis of all code files',
    default: false,
    type: 'boolean'
  })
  .option('model', {
    alias: 'm',
    describe: 'The name of the model to generate the analysis summary',
    default: process.env.SUMMARY_model,
    type: 'string'
  })
  .help()
  .alias('help', 'h')
  .argv;

  const directoryPath = options.dir;
  const fullAnalysis = options.all;
  const model = options.model;

  // Calculate and display the project size
  const projectSize = calculateProjectSize(directoryPath);
  tokenCount = projectSize/4
  cost = calculateTokensCost(model, 0, 0, tokenCount)
  console.log(`Project size: ~${tokenCount} tokens, estimated cost: $${chalk.yellow(cost.toFixed(4))}`);

  // Prompt the user to proceed
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('Proceed with summarizing the project? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      // Process the initial directory
      if (fullAnalysis) await processDirectory(directoryPath, model);

      // Watch for file changes in the directory
      const watcher = chokidar.watch(directoryPath, {
        ignored: /node_modules|autopilot|helpers/,
        persistent: true,
        ignoreInitial: true,
      });

      // Process the modified file
      watcher.on('change', async (filePath) => {
        if (fileExtensionsToProcess.includes(path.extname(filePath))) {
          console.log(`File modified: ${filePath}`);
          await processFile(filePath, model);
        }
      });

      console.log('Watching for file changes...');
    } else {
      console.log('Aborted summarizing the project.');
    }
    readline.close();
  });
}


main();
