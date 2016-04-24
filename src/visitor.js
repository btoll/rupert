'use strict';

const list = new Set([
    'ForStatement',
    'ForInStatement',
    'ForOfStatement',
    'DoWhileStatement',
    'WhileStatement'
]);

const isLoopStatement = type => list.has(type);

const captureLoops = (node, parent, results) =>
    results.push({
        node,
        type: 'DontUseLoops'
    });

const captureManager = (() => {
    const stack = [];
    let capturing = false;

    return {
        init(v) {
            stack.push({
                arguments: [],
                params: v ?
                    v.split(', ').reduce((acc, curr) => {
                        acc.push(curr);
                        return acc;
                    }, []) :
                [],
                free: null
            });

            capturing = true;
        },
        capture(v) {
            if (v === null) {
                const ctx = stack.pop();
                capturing = false;

                ctx.free = ctx.arguments.filter(v => ctx.params.indexOf(v) === -1);

                return ctx;
            } else {
                if (capturing) {
                    const ctx = stack.pop();

                    ctx.arguments.push(v);
                    stack.push(ctx);
                }
            }
        }
    };
})();

const captureFreeVariables = function (node, parent, results) {
    const bodies = node.body.body;

    captureManager.init(getParams(node.params));

    if (bodies && Array.isArray(bodies)) {
        const type = bodies[0].type;

        // We don't want to capture the node if it's a loop statement or IfStatement.
        if (bodies.length === 1 && !(isLoopStatement(type) || type === 'IfStatement')) {
            results.push({
                node: parent,
                type: 'UnnecessaryBraces'
            });
        }

        bodies.forEach(body => this.visit(body, node, results));
    } else {
        if (node.body.type === 'CallExpression' && compareParams(node, node.body)) {
            results.push({
                node: node,
                type: 'UnnecessaryFunctionNesting'
            });
        }

        this.visit(node.body, node, results);
    }

    const ctx = captureManager.capture(null);
    if (ctx.free.length) {
        results.push({
            node,
            type: 'ImpureFunction'
        });
    }
};

const compareParams = (caller, callee) =>
    callee.params && getParams(caller.params).indexOf(getParams(callee.params)) === 0;

const getParams = params =>
    params.map(arg => arg.name).join(', ');

module.exports = {
    ArrowFunctionExpression: captureFreeVariables,
    FunctionExpression: captureFreeVariables,

    ForStatement: captureLoops,
    ForInStatement: captureLoops,
    ForOfStatement: captureLoops,
    DoWhileStatement: captureLoops,
    WhileStatement: captureLoops,

    Identifier(node, parent) {
        if (parent.type !== 'VariableDeclaration') {
            captureManager.capture(node.name);
        }
    }
};

