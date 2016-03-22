/* eslint-disable no-console */
'use strict';

(() => {

    let esprima = require('esprima'),
        chalk = require('chalk'),
        visitor = require('./lib/visitor'),
        fs = require('fs');

    function getSuite(file, isData) {
        return new Promise((resolve, reject) => {
            if (isData) {
                resolve(file);
            } else {
                fs.readFile(file, 'utf8', (err, fileContents) => {
                    if (err) {
                        reject(`${chalk.red('[ERROR]')} There was a problem processing the file.`);
                    } else {
                        resolve(fileContents);
                    }
                });
            }
        });
    }

    function makeTree(file, printer, isData) {
        if (!file) {
            throw new Error('Rupert: No file given');
        }

        if (!printer) {
            throw new Error('Rupert: No printer given');
        }

//        console.log('Just a moment while we analyze the file...');

        return getSuite(file, isData)
        .then(suite => {
            let contents = visitTree(suite);

            return !contents.length ?
                `${chalk.yellow('[INFO]')} No results found for file ${file}` :
                printer.print(contents);
        });
    }

    function visitTree(suite) {
        return visitor.visit(esprima.parse(suite, {
            loc: true
        }), []);
    }

    module.exports = makeTree;
})();

