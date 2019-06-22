// Arrays are ordered lists of things. You use them all the time in programming.
//
// Useful reference:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// You can create an Array using the [] characters.
// Note the commas between the items.
// Return the array of fruit strings in the function below.

function threeFruits () {
  const fruits = ['Apple', 'Banana', 'Cherry']

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// An Array can contain multiple types. ie: strings, numbers, boolean, etc
// Return the array of values in the function below.

function multipleTypes () {
  const diverseArray = ['Skateboard', null, 8.75, 'Eiffel Tower', 44, 7, true, null]

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// You can access individual values of an array using bracket notation shown below.
// Remember that arrays start at index 0. So for an array "myArray" the *first* item can
// be accessed at myArray[0].
// Return the third item from the array "people" below.

function indexAccess () {
  const people = ['Jenny', 'James', 'Jimmy', 'Jonny', 'Julia', 'Jessica']

  // console.assert() allows you to declare things that should be true; it's like
  // a sanity-check for your code.
  // Here we are confirming that array access works like we expect:
  console.assert(people[0] === 'Jenny')
  console.assert(people[2] === 'Jimmy')
  console.assert(people[4] === 'Julia')

  // return the third item from the "people" array here

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Use the .length property to see the length of an array.
// Return the length of array "arr" below.

function useLength () {
  const arr = ['a', 'b', 'c']

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Add to the end of an array using the .push() method
// Add the string "d" to the array below and return the array.

function usePush () {
  let arr = ['a', 'b', 'c']

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Remove from the end of an array using the .pop() method
// Remove the last element of the array below and return the array.

function usePop () {
  let arr = ['a', 'b', 'c']

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// You can search an array using the .indexOf() method
// myArr.indexOf(<thing>) will return the first index of <thing> in myArr, or
// the value -1 if <thing> was not found
// Return the index of the first instance of "T" in the array below.

function useIndexOf () {
  let arr = ['C', 'A', 'G', 'T', 'A', 'A', 'G', 'T']

  // some demonstration of how .indexOf() works:
  console.assert(arr.indexOf('C') === 0)
  console.assert(arr.indexOf('A') === 1) // note this only returns the *first* instance of 'A'
  console.assert(arr.indexOf('Z') === -1) // no "Z" in this array

  // return the index of the first instance of "T" here

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Convert an Array into a string using .join()
// Return the string 'a-b-c-d-e-f' using .join() below

function useJoin () {
  const arr = ['a', 'b', 'c', 'd', 'e', 'f']

  // some examples of .join():
  console.assert(arr.join() === 'a,b,c,d,e,f') // joins using a comma by default
  console.assert(arr.join('ZZZ') === 'aZZZbZZZcZZZdZZZeZZZf')
  console.assert(arr.join('') === 'abcdef') // pass an empty string to have no separator

  // create and return the string 'a-b-c-d-e-f' here

}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Let's play with the alphabet using some Array and String methods.
//
// There is no test to write here; just try to follow what the code is doing
// and see if you can understand the console.assert() statements below.

const alphabetString = 'abcdefghijklmnopqrstuvwxyz'
const alphabetArray = alphabetString.split('')

// both Strings and Array have a .length property:
console.assert(alphabetString.length === 26)
console.assert(alphabetArray.length === 26)

// reverse our alphabet array
const reverseAlphabetArray = alphabetArray.reverse()

console.assert(reverseAlphabetArray[0] === 'z')
console.assert(reverseAlphabetArray[25] === 'a')
console.assert(reverseAlphabetArray.indexOf('z') === 0)
console.assert(reverseAlphabetArray.indexOf('a') === 25)
console.assert(reverseAlphabetArray.indexOf('5') === -1)

// join it back into a String
const reverseAlphabetString = reverseAlphabetArray.join('')

// Strings have a .toUpperCase() method, remember?
const uppercaseReverseAlphabetString = reverseAlphabetString.toUpperCase()

console.assert(uppercaseReverseAlphabetString === 'ZYXWVUTSRQPONMLKJIHGFEDCBA')

// Strings also have an .indexOf() method that works similarly to Arrays:
console.assert(uppercaseReverseAlphabetString.indexOf('Z') === 0)
console.assert(uppercaseReverseAlphabetString.indexOf('A') === 25)
console.assert(uppercaseReverseAlphabetString.indexOf('b') === -1)
