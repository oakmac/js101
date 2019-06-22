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
  let fnNames = []
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
function functionContainStatement (syntaxTree, fnName, expressionType) {
  const fnBodyStatements = getFnBody(syntaxTree, fnName)
  if (!fnBodyStatements) return false

  // NOTE: this is a total hack, but works fine for this use case
  const json = JSON.stringify(fnBodyStatements)
  return json.includes('"type":"' + expressionType + '"')
}

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

// -----------------------------------------------------------------------------
// Assertion Utils
// -----------------------------------------------------------------------------

function checkForFunction (filename, module, fnName) {
  it(filename + ' should contain a function "' + fnName + '"', function () {
    assert(isFn(module[fnName]), 'function "' + fnName + '" not found in exercises/' + filename)
  })
}

function checkModuleForFunctions (filename, module, fns) {
  const msg = filename + ' should have ' + fns.length + ' functions: ' + fns.join(', ')
  it(msg, function () {
    fns.forEach(function (fnName) {
      assert(isFn(module[fnName]), 'function "' + fnName + '" not found')
    })
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

  checkModuleForFunctions('100-numbers.js', module, ['makeANumber', 'makeAnInteger', 'makeAFloat', 'makeZero'])

  it('"makeANumber" function', function () {
    assertContainsVariable(syntaxTree, 'makeANumber', 'myNum')
    assertReturnsVariable(syntaxTree, 'makeANumber', 'myNum')
    assert(isNumber(module.makeANumber()), 'makeANumber() should return a valid JavaScript number.')
  })

  it('"makeAnInteger" function', function () {
    assertContainsVariable(syntaxTree, 'makeAnInteger', 'myInt')
    assertReturnsVariable(syntaxTree, 'makeAnInteger', 'myInt')
    assert(Number.isInteger(module.makeAnInteger()), 'makeAnInteger() should return a integer.')
  })

  it('"makeAFloat" function', function () {
    assertContainsVariable(syntaxTree, 'makeAFloat', 'myFloat')
    assertReturnsVariable(syntaxTree, 'makeAFloat', 'myFloat')
    assert(isFloat(module.makeAFloat()), 'makeAFloat() should return a float.')
  })

  it('"makeZero" function', function () {
    assertContainsVariable(syntaxTree, 'makeZero', 'zilch')
    assertReturnsVariable(syntaxTree, 'makeZero', 'zilch')
    assert(module.makeZero() === 0, 'makeZero() should return the number 0.')
  })
}

// -----------------------------------------------------------------------------
// 102 - Undefined, Booleans, Null
// -----------------------------------------------------------------------------

function check102 () {
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

  checkForFunction('102-undefined-booleans-null.js', module, 'makeNothing')
  it('"makeNothing" function', function () {
    assertContainsVariable(syntaxTree, 'makeNothing', 'huh')
    assertReturnsVariable(syntaxTree, 'makeNothing', 'huh')
    assert(undefined === module.makeNothing(), 'makeNothing() should return undefined.')
  })

  checkForFunction('102-undefined-booleans-null.js', module, 'makeBoolean')
  it('"makeBoolean" function', function () {
    assertContainsVariable(syntaxTree, 'makeBoolean', 'myBool')
    assertReturnsVariable(syntaxTree, 'makeBoolean', 'myBool')
    assert(isBoolean(module.makeBoolean()), 'makeBoolean() should return a boolean value (true or false).')
  })

  checkForFunction('102-undefined-booleans-null.js', module, 'makeTrue')
  it('"makeTrue" function', function () {
    assertContainsVariable(syntaxTree, 'makeTrue', 'yup')
    assertReturnsVariable(syntaxTree, 'makeTrue', 'yup')
    assert(module.makeTrue() === true, 'makeTrue() should return the boolean value true.')
  })

  checkForFunction('102-undefined-booleans-null.js', module, 'makeFalse')
  it('"makeFalse" function', function () {
    assertContainsVariable(syntaxTree, 'makeFalse', 'nope')
    assertReturnsVariable(syntaxTree, 'makeFalse', 'nope')
    assert(module.makeFalse() === false, 'makeFalse() should return the boolean value false.')
  })

  checkForFunction('102-undefined-booleans-null.js', module, 'makeNull')
  it('"makeNull" function', function () {
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

  checkForFunction('104-strings.js', module, 'helloWorld')
  it('"helloWorld" function', function () {
    assert(module.helloWorld() === 'Hello, world!', 'helloWorld() should return the string "Hello, world!".')
  })

  checkForFunction('104-strings.js', module, 'helloName')
  it('"helloName" function', function () {
    assert(module.helloName('Bob') === 'Hello, Bob!', 'helloName("Bob") should return the string "Hello, Bob!".')
    assert(module.helloName('') === 'Hello, !', 'helloName("") should return the string "Hello, !".')
  })

  checkForFunction('104-strings.js', module, 'abstractLength')
  it('"abstractLength" function', function () {
    assert(module.abstractLength() === tarPitAbstract.length, 'abstractLength() should return the length of the "tarPitAbstract" string.')
    assert.ok(functionContainsText(fileContents, 'abstractLength', 'tarPitAbstract.length'), 'abstractLength() should use the .length property')
  })

  const chorus = 'Who let the dogs out?'
  checkForFunction('104-strings.js', module, 'makeLoud')
  it('"makeLoud" function', function () {
    assert(module.makeLoud() === chorus.toUpperCase(), 'makeLoud() should return the string "' + chorus.toUpperCase() + '"')
    assert.ok(functionContainsText(fileContents, 'makeLoud', '.toUpperCase()'), 'makeLoud() should use the .toUpperCase() method')
  })

  checkForFunction('104-strings.js', module, 'makeQuiet')
  it('"makeQuiet" function', function () {
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

  checkForFunction('106-math.js', module, 'add99')
  it('"add99" function', function () {
    assert(module.add99(1) === 100, 'add99(1) should return 100.')
    assert(module.add99(-56) === 43, 'add99(-56) should return 43.')
    assert(module.add99(99) === 198, 'add99(99) should return 198.')
    assert(module.add99(0) === 99, 'add99(0) should return 99.')
    assert(module.add99(3.14) === 102.14, 'add99(3.14) should return 102.14.')
  })

  checkForFunction('106-math.js', module, 'sum')
  it('"sum" function', function () {
    assert(module.sum(1, 1) === 2, 'sum(1, 1) should return 2')
    assert(module.sum(0, 0) === 0, 'sum(0, 0) should return 0')
    assert(module.sum(99, 1) === 100, 'sum(99, 1) should return 100')
    assert(module.sum(3.14, 0) === 3.14, 'sum(3.14, 0) should return 3.14')
    assert(module.sum(3.14, 1000) === 1003.14, 'sum(3.14, 1000) should return 1003.14')
  })

  checkForFunction('106-math.js', module, 'difference')
  it('"difference" function', function () {
    assert(module.difference(1, 1) === 0, 'difference(1, 1) should return 0')
    assert(module.difference(0, 0) === 0, 'difference(0, 0) should return 0')
    assert(module.difference(99, 1) === 98, 'difference(99, 1) should return 98')
    assert(module.difference(3.14, 0) === 3.14, 'difference(3.14, 0) should return 3.14')
    assert(module.difference(3.14, 1000) === -996.86, 'difference(3.14, 1000) should return -996.86')
  })

  checkForFunction('106-math.js', module, 'multiply')
  it('"multiply" function', function () {
    assert(module.multiply(1, 1) === 1, 'multiply(1, 1) should return 1')
    assert(module.multiply(0, 0) === 0, 'multiply(0, 0) should return 0')
    assert(module.multiply(99, 1) === 99, 'multiply(99, 1) should return 99')
    assert(module.multiply(3.14, 0) === 0, 'multiply(3.14, 0) should return 0')
    assert(module.multiply(3.14, 1000) === 3140, 'multiply(3.14, 1000) should return 3140')
  })

  checkForFunction('106-math.js', module, 'divide')
  it('"divide" function', function () {
    assert(module.divide(1, 1) === 1, 'divide(1, 1) should return 1')
    assert(Number.isNaN(module.divide(0, 0)), 'divide(0, 0) should return NaN (not a number)')
    assert(module.divide(99, 1) === 99, 'divide(99, 1) should return 99')
    assert(module.divide(3.14, 0) === Infinity, 'divide(3.14, 0) should return Infinity')
    assert(module.divide(3.14, 1000) === 0.00314, 'divide(3.14, 1000) should return 0.00314')
  })

  checkForFunction('106-math.js', module, 'mod')
  it('"mod" function', function () {
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

  checkForFunction('108-arrays.js', module, 'threeFruits')
  const threeFruits = ['Apple', 'Banana', 'Cherry']
  it('"threeFruits" function', function () {
    assert.deepStrictEqual(module.threeFruits(), threeFruits, 'threeFruits() should return the array of fruit strings.')
  })

  checkForFunction('108-arrays.js', module, 'multipleTypes')
  const diverseArray = ['Skateboard', null, 8.75, 'Eiffel Tower', 44, 7, true, null]
  it('"multipleTypes" function', function () {
    assert.deepStrictEqual(module.multipleTypes(), diverseArray, 'multipleTypes() should return the array of multiple types.')
  })

  checkForFunction('108-arrays.js', module, 'indexAccess')
  it('"indexAccess" function', function () {
    assert.deepStrictEqual(module.indexAccess(), 'Jimmy', 'indexAccess() should return the the third item in the array "people".')
    // TODO: make sure they used array index access here instead of just returning the string 'Jimmy'
  })

  checkForFunction('108-arrays.js', module, 'useLength')
  it('"useLength" function', function () {
    assert.deepStrictEqual(module.useLength(), 3, 'useLength() should return 3.')
    // TODO: make sure they used the .length property here
  })

  checkForFunction('108-arrays.js', module, 'usePush')
  it('"usePush" function', function () {
    assert.deepStrictEqual(module.usePush(), ['a', 'b', 'c', 'd'], 'usePush() should return the array ["a", "b", "c", "d"].')
    // TODO: make sure they used the .push() method here
  })

  checkForFunction('108-arrays.js', module, 'usePop')
  it('"usePop" function', function () {
    assert.deepStrictEqual(module.usePop(), ['a', 'b'], 'usePop() should return the array ["a", "b"].')
    // TODO: make sure they used the .pop() method here
  })

  checkForFunction('108-arrays.js', module, 'useIndexOf')
  it('"useIndexOf" function', function () {
    assert.deepStrictEqual(module.useIndexOf(), 3, 'useIndexOf() should return 3.')
    // TODO: make sure they used the .indexOf() method here
  })

  checkForFunction('108-arrays.js', module, 'useJoin')
  it('"useJoin" function', function () {
    assert.deepStrictEqual(module.useJoin(), 'a-b-c-d-e-f', 'useJoin() should return "a-b-c-d-e-f".')
    // TODO: make sure they used the .join() method here
  })
}

// -----------------------------------------------------------------------------
// 200 - Objects
// -----------------------------------------------------------------------------

function check200 () {
  const moduleFileName = '../' + moduleName('exercises/200-objects.js')
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

  const fileContents = fs.readFileSync('exercises/200-objects.js', utf8)
  const syntaxTree = esprima.parseScript(fileContents)

  checkForFunction('200-objects.js', module, 'getValue')
  it('"getValue" function', function () {
    var user = {
      "id": 1,
      "first_name": "Wittie",
      "last_name": "Armall",
      "email": "warmall0@earthlink.net",
      "gender": "Male",
      "ip_address": "60.13.194.247"
    }
    assert.deepStrictEqual(module.getValue(user, "id"), 1, 'tgetValue(user, "id") should return 1')
    assert.deepStrictEqual(module.getValue(user, "email"), "warmall0@earthlink.net", 'getValue(user, "email") should return "warmall0@earthlink.net"')
  })

  checkForFunction('200-objects.js', module, 'addProp')
  it('"addProp" function', function () {
    var user2 = {
        "id": 2,
        "first_name": "Allys",
        "last_name": "Maceur",
        "email": "amaceur1@youtube.com",
        "gender": "Female",
        "ip_address": "190.63.227.21"
    }
    assert.deepStrictEqual(module.addProp(user2, "pet", "cat")["pet"], "cat", '(addProp, "pet", "cat") should add a new key value pair')
  })

  checkForFunction('200-objects.js', module, 'getKeys')
  it('"getKeys" function', function () {
    var user3 = {
      "id": 3,
      "first_name": "Micah",
      "last_name": "Cockney",
      "email": "mcockney2@cafepress.com",
      "gender": "Male",
      "ip_address": "44.60.248.14"
    }
    assert.deepStrictEqual(Array.isArray(module.addProp(user3)), true, 'addProp(user3) should return an Array')
    assert.deepStrictEqual(module.addProp(user3).length, 6, 'addProp(user3) should return an Array with 5 keys')
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
  describe('Objects', check200)
  // TODO: Boolean Operations
  // TODO: adventures in concatenation
  destroyModuleFiles()
}
