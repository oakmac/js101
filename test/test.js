/* global describe it */

// -----------------------------------------------------------------------------
// Requires
// -----------------------------------------------------------------------------

const fs = require('fs-plus')
const glob = require('glob')
const assert = require('assert')
const esprima = require('esprima')
const traverse = require('traverse')

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const exerciseFiles = glob.sync('exercises/*.js')
const modulesDir = 'exercises-modules/'
const utf8 = 'utf8'
const squigglyLine = '// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n'
const exportsComment = '\n\n\n\n\n' +
  squigglyLine +
  '// Module Exports (automatically generated)\n' +
  squigglyLine

// -----------------------------------------------------------------------------
// Stateful
// -----------------------------------------------------------------------------

let allSyntaxValid = true

// -----------------------------------------------------------------------------
// Module Magic
// -----------------------------------------------------------------------------

// returns an array of the top-level function names from a script
function getTopLevelFunctions (syntaxTree) {
  const fnNames = []
  for (let i = 0; i < syntaxTree.body.length; i++) {
    const itm = syntaxTree.body[i]
    if (itm.type === 'FunctionDeclaration') {
      fnNames.push(itm.id.name)
    }
  }
  return fnNames
}

// example filename --> module filename
function moduleName (f) {
  return f.replace('exercises/', modulesDir)
    .replace('.js', '.module.js')
}

function moduleExportStatement (fnName) {
  return 'module.exports.' + fnName + ' = ' + fnName
}

function createModuleFile (f) {
  const fileContents = fs.readFileSync(f, utf8)
  const syntaxTree = esprima.parseScript(fileContents)
  const topLevelFns = getTopLevelFunctions(syntaxTree)
  const moduleFileContents = fileContents +
                             exportsComment +
                             topLevelFns.map(moduleExportStatement).join('\n') +
                             '\n\n\n'
  const moduleFileName = moduleName(f)
  fs.writeFileSync(moduleFileName, moduleFileContents)
}

function createModuleFiles () {
  if (!fs.existsSync(modulesDir)) {
    fs.mkdirSync(modulesDir)
  }
  exerciseFiles.forEach(createModuleFile)
}

function destroyModuleFiles () {
  fs.removeSync(modulesDir)
}

// -----------------------------------------------------------------------------
// Check JS Syntax
// -----------------------------------------------------------------------------

// returns the "body" part of fnName
// NOTE: assumes that fnName is a top-level function
function getFnBody (body, fnName) {
  for (let i = 0; i < body.length; i++) {
    if (body[i].type === 'FunctionDeclaration' &&
        body[i].id.name === fnName) {
      return body[i].body
    }
  }

  return false
}

// does "fnName" return variable "identifierName"?
function fnReturnsIdentifier (syntaxTree, fnName, identifierName) {
  const fnBodyStatements = getFnBody(syntaxTree, fnName)
  if (!fnBodyStatements) return false

  let foundReturnStatement = false
  traverse(fnBodyStatements).forEach(function (statement) {
    if (isArray(statement)) return

    if (isObject(statement) && statement.type && statement.type === 'ReturnStatement' &&
        statement.argument && isObject(statement.argument) && statement.argument.type && statement.argument.type === 'Identifier' &&
        statement.argument.name && statement.argument.name === identifierName) {
      foundReturnStatement = true
    }
  })
  return foundReturnStatement
}

// does "fnName" contain a variable named "varName"?
function fnContainVariable (syntaxTree, fnName, varName) {
  const fnBodyStatements = getFnBody(syntaxTree, fnName)
  if (!fnBodyStatements) return false

  let variableExists = false
  traverse(fnBodyStatements).forEach(function (statement) {
    if (isArray(statement)) return

    if (isObject(statement) && statement.type && statement.type === 'VariableDeclarator' &&
        isObject(statement.id) && statement.id.type && statement.id.type === 'Identifier' &&
        statement.id.name && statement.id.name === varName) {
      variableExists = true
    }
  })
  return variableExists
}

// does "fnName" contain "expressionType"?
// function functionContainStatement (syntaxTree, fnName, expressionType) {
//   const fnBodyStatements = getFnBody(syntaxTree, fnName)
//   if (!fnBodyStatements) return false
//
//   // NOTE: this is a total hack, but works fine for this use case
//   const json = JSON.stringify(fnBodyStatements)
//   return json.includes('"type":"' + expressionType + '"')
// }

function checkFileSyntax (f) {
  const fileContents = fs.readFileSync(f, utf8)

  // check for empty files
  if (fileContents === '') {
    it(f + ' is an empty file', function () {
      assert.fail(f + ' should not be empty')
    })
    allSyntaxValid = false
    return
  }

  // try parsing the JS
  let parsed = null
  try {
    parsed = esprima.parseScript(fileContents)
  } catch (e) { }
  if (!parsed) {
    allSyntaxValid = false

    it(f + ' should be valid JavaScript syntax', function () {
      assert.ok(parsed, f + ' has invalid syntax')
    })
  }
}

function checkJSSyntax () {
  exerciseFiles.forEach(checkFileSyntax)
}

// -----------------------------------------------------------------------------
// Util
// -----------------------------------------------------------------------------

function isBoolean (b) {
  return b === true || b === false
}

function isFn (f) {
  return typeof f === 'function'
}

function isNumber (n) {
  return typeof n === 'number' && !Number.isNaN(n)
}

function isFloat (f) {
  return isNumber(f) && f % 1 !== 0
}

function isObject (o) {
  return typeof o === 'object' && o !== null && isFn(o.hasOwnProperty)
}

function isArray (a) {
  return Array.isArray(a)
}

function countKeys (o) {
  const keys = []
  let k

  for (k in o) {
    if (Object.prototype.hasOwnProperty.call(o, k)) {
      keys.push(k)
    }
  }
  return keys.length
}

// -----------------------------------------------------------------------------
// Assertion Utils
// -----------------------------------------------------------------------------

function checkForFunction (filename, theirModule, fnName) {
  it(filename + ' should contain a function "' + fnName + '"', function () {
    assert(isFn(theirModule[fnName]), 'function "' + fnName + '" not found in exercises/' + filename)
  })
}

function assertContainsVariable (syntaxTree, fnName, varName) {
  assert.ok(fnContainVariable(syntaxTree.body, fnName, varName),
    'function "' + fnName + '" should contain the variable "' + varName + '"')
}

function assertReturnsVariable (syntaxTree, fnName, varName) {
  assert.ok(fnReturnsIdentifier(syntaxTree.body, fnName, varName),
    'function "' + fnName + '" should return the variable "' + varName + '"')
}

// this is a hack, but mostly works
// TODO: check the syntax tree properly instead
function functionContainsText (moduleText, fnName, expressionText) {
  const functionStartIdx = moduleText.indexOf('function ' + fnName)
  if (functionStartIdx === -1) return false

  const moduleTextAfterFn = moduleText.substring(functionStartIdx)
  return moduleTextAfterFn.includes(expressionText)
}

// -----------------------------------------------------------------------------
// 100 - Numbers
// -----------------------------------------------------------------------------

function check100 () {
  const filename = '100-numbers.js'
  const moduleFileName = '../' + moduleName('exercises/100-numbers.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/100-numbers.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'makeANumber')
  it('"makeANumber" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeANumber', 'myNum')
    assertReturnsVariable(syntaxTree, 'makeANumber', 'myNum')
    assert(isNumber(module.makeANumber()), 'makeANumber() should return a valid JavaScript number.')
  })

  checkForFunction(filename, module, 'makeAnInteger')
  it('"makeAnInteger" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeAnInteger', 'myInt')
    assertReturnsVariable(syntaxTree, 'makeAnInteger', 'myInt')
    assert(Number.isInteger(module.makeAnInteger()), 'makeAnInteger() should return a integer.')
  })

  checkForFunction(filename, module, 'makeAFloat')
  it('"makeAFloat" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeAFloat', 'myFloat')
    assertReturnsVariable(syntaxTree, 'makeAFloat', 'myFloat')
    assert(isFloat(module.makeAFloat()), 'makeAFloat() should return a float.')
  })

  checkForFunction(filename, module, 'makeZero')
  it('"makeZero" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeZero', 'zilch')
    assertReturnsVariable(syntaxTree, 'makeZero', 'zilch')
    assert(module.makeZero() === 0, 'makeZero() should return the number 0.')
  })
}

// -----------------------------------------------------------------------------
// 102 - Undefined, Booleans, Null
// -----------------------------------------------------------------------------

function check102 () {
  const filename = '102-undefined-booleans-null.js'
  const moduleFileName = '../' + moduleName('exercises/102-undefined-booleans-null.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/102-undefined-booleans-null.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'makeNothing')
  it('"makeNothing" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeNothing', 'huh')
    assertReturnsVariable(syntaxTree, 'makeNothing', 'huh')
    assert(undefined === module.makeNothing(), 'makeNothing() should return undefined.')
  })

  checkForFunction(filename, module, 'makeBoolean')
  it('"makeBoolean" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeBoolean', 'myBool')
    assertReturnsVariable(syntaxTree, 'makeBoolean', 'myBool')
    assert(isBoolean(module.makeBoolean()), 'makeBoolean() should return a boolean value (true or false).')
  })

  checkForFunction(filename, module, 'makeTrue')
  it('"makeTrue" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeTrue', 'yup')
    assertReturnsVariable(syntaxTree, 'makeTrue', 'yup')
    assert(module.makeTrue() === true, 'makeTrue() should return the boolean value true.')
  })

  checkForFunction(filename, module, 'makeFalse')
  it('"makeFalse" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeFalse', 'nope')
    assertReturnsVariable(syntaxTree, 'makeFalse', 'nope')
    assert(module.makeFalse() === false, 'makeFalse() should return the boolean value false.')
  })

  checkForFunction(filename, module, 'makeNull')
  it('"makeNull" function implementation', function () {
    assertContainsVariable(syntaxTree, 'makeNull', 'nothingMuch')
    assertReturnsVariable(syntaxTree, 'makeNull', 'nothingMuch')
    assert(module.makeNull() === null, 'makeNull() should return null.')
  })
}

// -----------------------------------------------------------------------------
// 104 - Strings
// -----------------------------------------------------------------------------

const tarPitAbstract = 'Complexity is the single major difficulty in the successful development of large-scale software systems. ' +
  'Following Brooks we distinguish accidental from essential difficulty, but disagree with his premise that most complexity remaining in contemporary systems is essential. ' +
  'We identify common causes of complexity and discuss general approaches which can be taken to eliminate them where they are accidental in nature. ' +
  'To make things more concrete we then give an outline for a potential complexity-minimizing approach based on functional programming and Codd’s relational model of data.'

function check104 () {
  const filename = '104-strings.js'
  const moduleFileName = '../' + moduleName('exercises/104-strings.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/104-strings.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'helloWorld')
  it('"helloWorld" function implementation', function () {
    assert(module.helloWorld() === 'Hello, world!', 'helloWorld() should return the string "Hello, world!".')
  })

  checkForFunction(filename, module, 'helloName')
  it('"helloName" function implementation', function () {
    assert(module.helloName('Bob') === 'Hello, Bob!', 'helloName("Bob") should return the string "Hello, Bob!".')
    assert(module.helloName('') === 'Hello, !', 'helloName("") should return the string "Hello, !".')
  })

  checkForFunction(filename, module, 'abstractLength')
  it('"abstractLength" function implementation', function () {
    assert(module.abstractLength() === tarPitAbstract.length, 'abstractLength() should return the length of the "tarPitAbstract" string.')
    assert.ok(functionContainsText(fileContents, 'abstractLength', 'tarPitAbstract.length'), 'abstractLength() should use the .length property')
  })

  checkForFunction(filename, module, 'makeLoud')
  const chorus = 'Who let the dogs out?'
  it('"makeLoud" function implementation', function () {
    assert(module.makeLoud() === chorus.toUpperCase(), 'makeLoud() should return the string "' + chorus.toUpperCase() + '"')
    assert.ok(functionContainsText(fileContents, 'makeLoud', '.toUpperCase()'), 'makeLoud() should use the .toUpperCase() method')
  })

  checkForFunction(filename, module, 'makeQuiet')
  it('"makeQuiet" function implementation', function () {
    assert(module.makeQuiet('ABC') === 'abc', 'makeQuiet("ABC") should return the string "abc"')
    assert(module.makeQuiet('abc') === 'abc', 'makeQuiet("abc") should return the string "abc"')
    assert(module.makeQuiet('XyZ') === 'xyz', 'makeQuiet("XyZ") should return the string "xyz"')
    assert(module.makeQuiet('AAA bbb CCC') === 'aaa bbb ccc', 'makeQuiet("AAA bbb CCC") should return the string "aaa bbb ccc"')
    assert(module.makeQuiet('') === '', 'makeQuiet("") should return the string ""')
    assert.ok(functionContainsText(fileContents, 'makeQuiet', '.toLowerCase()'), 'makeQuiet() should use the .toLowerCase() method')
  })
}

// -----------------------------------------------------------------------------
// 106 - Math
// -----------------------------------------------------------------------------

function check106 () {
  const filename = '106-math.js'
  const moduleFileName = '../' + moduleName('exercises/106-math.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/106-math.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'add99')
  it('"add99" function implementation', function () {
    assert(module.add99(1) === 100, 'add99(1) should return 100.')
    assert(module.add99(-56) === 43, 'add99(-56) should return 43.')
    assert(module.add99(99) === 198, 'add99(99) should return 198.')
    assert(module.add99(0) === 99, 'add99(0) should return 99.')
    assert(module.add99(3.14) === 102.14, 'add99(3.14) should return 102.14.')
  })

  checkForFunction(filename, module, 'sum')
  it('"sum" function implementation', function () {
    assert(module.sum(1, 1) === 2, 'sum(1, 1) should return 2')
    assert(module.sum(0, 0) === 0, 'sum(0, 0) should return 0')
    assert(module.sum(99, 1) === 100, 'sum(99, 1) should return 100')
    assert(module.sum(3.14, 0) === 3.14, 'sum(3.14, 0) should return 3.14')
    assert(module.sum(3.14, 1000) === 1003.14, 'sum(3.14, 1000) should return 1003.14')
  })

  checkForFunction(filename, module, 'difference')
  it('"difference" function implementation', function () {
    assert(module.difference(1, 1) === 0, 'difference(1, 1) should return 0')
    assert(module.difference(0, 0) === 0, 'difference(0, 0) should return 0')
    assert(module.difference(99, 1) === 98, 'difference(99, 1) should return 98')
    assert(module.difference(3.14, 0) === 3.14, 'difference(3.14, 0) should return 3.14')
    assert(module.difference(3.14, 1000) === -996.86, 'difference(3.14, 1000) should return -996.86')
  })

  checkForFunction(filename, module, 'multiply')
  it('"multiply" function implementation', function () {
    assert(module.multiply(1, 1) === 1, 'multiply(1, 1) should return 1')
    assert(module.multiply(0, 0) === 0, 'multiply(0, 0) should return 0')
    assert(module.multiply(99, 1) === 99, 'multiply(99, 1) should return 99')
    assert(module.multiply(3.14, 0) === 0, 'multiply(3.14, 0) should return 0')
    assert(module.multiply(3.14, 1000) === 3140, 'multiply(3.14, 1000) should return 3140')
  })

  checkForFunction(filename, module, 'divide')
  it('"divide" function implementation', function () {
    assert(module.divide(1, 1) === 1, 'divide(1, 1) should return 1')
    assert(module.divide(4, 2) === 2, 'divide(4, 2) should return 2')
    assert(module.divide(100, 20) === 5, 'divide(100, 20) should return 5')
    assert(module.divide(1, 2) === 0.5, 'divide(1, 2) should return 0.5')
    assert(module.divide(4.2, 2.1) === 2, 'divide(4.2, 2.1) should return 2')
    assert(Number.isNaN(module.divide(0, 0)), 'divide(0, 0) should return NaN (not a number)')
    assert(module.divide(99, 1) === 99, 'divide(99, 1) should return 99')
    assert(module.divide(3.14, 0) === Infinity, 'divide(3.14, 0) should return Infinity')
    assert(module.divide(3.14, 1000) === 0.00314, 'divide(3.14, 1000) should return 0.00314')
  })

  checkForFunction(filename, module, 'mod')
  it('"mod" function implementation', function () {
    assert(module.mod(1, 1) === 0, 'mod(1, 1) should return 0')
    assert(Number.isNaN(module.mod(0, 0)), 'mod(0, 0) should return NaN (not a number)')
    assert(module.mod(99, 1) === 0, 'mod(99, 1) should return 0')
    assert(module.mod(99, 22) === 11, 'mod(99, 22) should return 11')
    assert(Number.isNaN(module.mod(3.14, 0)), 'mod(3.14, 0) should return NaN (not a number)')
    assert(module.mod(3.14, 1000) === 3.14, 'mod(3.14, 1000) should return 3.14')
  })
}

// -----------------------------------------------------------------------------
// 108 - Arrays
// -----------------------------------------------------------------------------

function check108 () {
  const filename = '108-arrays.js'
  const moduleFileName = '../' + moduleName('exercises/108-arrays.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/108-arrays.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'threeFruits')
  const threeFruits = ['Apple', 'Banana', 'Cherry']
  it('"threeFruits" function implementation', function () {
    assert.deepStrictEqual(module.threeFruits(), threeFruits, 'threeFruits() should return the array of fruit strings.')
  })

  checkForFunction(filename, module, 'multipleTypes')
  const diverseArray = ['Skateboard', null, 8.75, 'Eiffel Tower', 44, 7, true, null]
  it('"multipleTypes" function implementation', function () {
    assert.deepStrictEqual(module.multipleTypes(), diverseArray, 'multipleTypes() should return the array of multiple types.')
  })

  checkForFunction(filename, module, 'indexAccess')
  it('"indexAccess" function implementation', function () {
    assert.deepStrictEqual(module.indexAccess(), 'Jimmy', 'indexAccess() should return the third item in the array "people".')
    // TODO: make sure they used array index access here instead of just returning the string 'Jimmy'
  })

  checkForFunction(filename, module, 'useLength')
  it('"useLength" function implementation', function () {
    assert.deepStrictEqual(module.useLength(), 3, 'useLength() should return 3.')
    // TODO: make sure they used the .length property here
  })

  checkForFunction(filename, module, 'usePush')
  it('"usePush" function implementation', function () {
    assert.deepStrictEqual(module.usePush(), ['a', 'b', 'c', 'd'], 'usePush() should return the array ["a", "b", "c", "d"].')
    // TODO: make sure they used the .push() method here
  })

  checkForFunction(filename, module, 'usePop')
  it('"usePop" function implementation', function () {
    assert.deepStrictEqual(module.usePop(), ['a', 'b'], 'usePop() should return the array ["a", "b"].')
    // TODO: make sure they used the .pop() method here
  })

  checkForFunction(filename, module, 'useIndexOf')
  it('"useIndexOf" function implementation', function () {
    assert.deepStrictEqual(module.useIndexOf(), 3, 'useIndexOf() should return 3.')
    // TODO: make sure they used the .indexOf() method here
  })

  checkForFunction(filename, module, 'useJoin')
  it('"useJoin" function implementation', function () {
    assert.deepStrictEqual(module.useJoin(), 'a-b-c-d-e-f', 'useJoin() should return "a-b-c-d-e-f".')
    // TODO: make sure they used the .join() method here
  })
}

// -----------------------------------------------------------------------------
// 110 - Objects
// -----------------------------------------------------------------------------

function check110 () {
  const filename = '110-objects.js'
  const moduleFileName = '../' + moduleName('exercises/110-objects.js')
  let module = null
  try {
    module = require(moduleFileName)
  } catch (e) { }

  if (!module) {
    it('Unable to read ' + moduleFileName, function () {
      assert.fail('Unable to read ' + moduleFileName)
    })
    return
  }

  const fileContents = fs.readFileSync('exercises/110-objects.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction(filename, module, 'threeNumbers')
  const numbers = { numberOne: 1, numberTwo: 2, numberThree: 3 }
  it('"threeNumbers" function implementation', function () {
    assert.deepStrictEqual(module.threeNumbers(), numbers, 'threeFruits() should return the object of numbers.')
  })

  checkForFunction(filename, module, 'manyTypes')
  const diverseObject = { name: 'banana', count: 42, delicious: true }
  it('"manyTypes" function implementation', function () {
    assert.deepStrictEqual(module.manyTypes(), diverseObject, 'manyTypes() should return the Object of multiple types.')
  })

  checkForFunction(filename, module, 'keyAccess')
  it('"keyAccess" function implementation', function () {
    assert.deepStrictEqual(module.keyAccess(), 'banana', 'keyAccess() should return the Object property called "name"')
    // TODO: make sure they returned the object["name"] with bracket syntax
  })

  checkForFunction(filename, module, 'addKey')
  it('"addKey" function implementation', function () {
    const bestFruit = { name: 'banana', count: 42, delicious: true, color: 'yellow' }
    assert.deepStrictEqual(module.addKey(), bestFruit, 'addKey() should return bestFruit including a "color" property.')
    // TODO: make sure they added {color:"yellow"} to bestFruit
  })

  checkForFunction(filename, module, 'largeObject')
  it('"largeObject" function implementation', function () {
    assert.deepStrictEqual(isObject(module.largeObject()), true, 'largeObject() should return an Object.')
    assert.deepStrictEqual(countKeys(module.largeObject()), 8, 'largeObject() should return an Object with 8 properties.')
    // TODO: make sure there is an object called bootcampStudent and they didn't return it.
  })

  checkForFunction(filename, module, 'nestedArray')
  it('"nestedArray" function implementation', function () {
    assert.deepStrictEqual(module.nestedArray(), 'salmon', 'nestedArray() should return the second item of nested array favoriteFoods. Remember Arrays start counting at 0')
    // TODO: make sure they returned the reference, not "salmon".
  })

  checkForFunction(filename, module, 'dotNotation')
  it('"dotNotation" function implementation', function () {
    assert.deepStrictEqual(module.dotNotation(), 'Susan', 'dotNotation() should return the name of bootcampInstructor')
    // TODO: make sure they returned the reference, not "Susan".
    // TODO: make sure they used dot notation.
  })
}

// -----------------------------------------------------------------------------
// Run the tests
// -----------------------------------------------------------------------------

describe('JavaScript Syntax', checkJSSyntax)

// only run the test suite if there were no syntax errors
if (allSyntaxValid) {
  createModuleFiles()
  describe('Numbers', check100)
  describe('Undefined, booleans, null', check102)
  describe('Strings', check104)
  describe('Math', check106)
  describe('Arrays', check108)
  describe('Objects', check110)
  // TODO: Boolean Operations
  // TODO: adventures in concatenation
  destroyModuleFiles()
}
