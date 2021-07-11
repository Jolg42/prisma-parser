# Prisma schema parser

## Requirements

For running built package, ES2015+ environment is necessary. For running the tests,
nodejs 14+ with npm 7+ is required.

## Installation

1. Checkout the repo
2. Run `npm install`
3. Run `npm build` if you want to build JS version of the package

## Usage

```js
import { parse, print } from 'prisma-parser'

const ast = parse(`
    model User {
        id Int @id
    }
`) // takes a string and produces ast

const code = print(ast) // takes ast and produces stringified version of the code
```

AST nodes themselves are defined in [`src/ast.ts`](src/ast.ts) file.
