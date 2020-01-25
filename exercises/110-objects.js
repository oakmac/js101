// Objects are collections of key/value pairs. You use them all the time in programming.
//
// Useful reference:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// You can create an Object using the {} characters.
// Note the commas between the items.
// Return the object of numbers in the function below.

function threeNumbers () {
  const numbers = {numberOne: 1, numberTwo: 2, numberThree: 3}

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// An Object can contain any type for each property. ie: strings, numbers, boolean, etc
// Return the object of values in the function below.

function manyTypes () {
  const diverseObject = {name: "banana", count: 42, delicious: true}

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// You can access individual values of an object using bracket notation shown below.
// This allows you to write the label (key) assigned to the value and get the value back.
// All Object keys are strings.
// Return the name of the bestFruit Object below.

function keyAccess () {
  const bestFruit = {name: "banana", count: 42, delicious: true}

  // console.assert() allows you to declare things that should be true; it's like
  // a sanity-check for your code.
  // Here we are confirming that array access works like we expect:
  console.assert(bestFruit["name"] === 'banana')
  console.assert(bestFruit["count"] === 42)
  console.assert(bestFruit["delicious"] === true)

  // return the name of the bestFruit Object here.

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Add a property to an Object by simply assigning value to a new key.
// Add the string "yellow" under the key "color" of the bestFruit Object.
// Then return return the object.

function addKey () {
  let bestFruit = {name: "banana", count: 42}

// Note that before a key is assigned it will always return `undefined`
  console.assert(bestFruit["delicious"] === undefined)
  bestFruit["delicious"] = true
  console.assert(bestFruit["delicious"] === true)

// Assign "yellow" to the key "color" of bestFruit here and return bestFruit

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// When an Object gets large, it is normal to define its properties line by line.
// Create your own object named bootcampInstructor and give it 8 properties.
// Return that object.

function largeObject () {
  const bootcampStudent = {
    name: "Susan",
    email: "susan@bootcamp.digitalcrafts",
    age: 32,
    heightFeet: 5.5,
    favoriteColor: "green",
    homeTown: "Houston",
    pet: "cat",
    ownsCar: true
  }

}