var Client = require('node-rest-client').Client;
var async = require('async');
var Q = require('q');

var client = new Client();

// result contains the solution.
var result = [];
// matrix is a 2d array used to store the validity of x.y
var matrix;

// interim results with promises.
let promisesArray = [];

/** 
 * initializeMatrix at x,y, given the maze id.
 * This helps to find if a given x, y is valid.
 * this can be useful if we want to cache this
 * for dynamic programming improvements
 */

function initializeMatrixAt(x, y, id) {
  var url = 'https://maze.coda.io/maze/' + id + '/check?x=' + x + '&y=' + y;
  let deferred = Q.defer(); 
  return client.get(url, function (data, response) {
    if (response.statusCode === 200) {
      matrix[x][y] = true;
    } else {
      matrix[x][y] = false;
    }
  });
};

/** Initialize the whole matrix to find out for all possible
 * combinations of x and y
 */
function  initializeMatrix(data2) {
  console.log('Starting to compute solutions. Please wait...');
  promisesArray = [];
  for (let i=0; i <data2.height; i++) {
    for (let j=0; j < data2.width; j++) {
      initializeMatrixAt(i, j, data2.id)
      promisesArray.push(initializeMatrixAt(i,j,data2.id));
    }
  }
  return Q.all(promisesArray);
};

/**
 * Utitlity to print the matrix 
 */
function printMatrix(data2) {
  console.log('Start of printMatrix');
  for (let i=0; i <data2.height; i++) {
    for (let j=0; j < data2.width; j++) {
      console.log('printMatrix', i, j, matrix[i][j]);
      //Promise.all[initializeMatrixAt(i,j,data2.id)];
    }
  }
};

/** Recursively find out if there is a path
 * Decrement x by one keeping y the same 
 * or decrement y by one keeping x the same
 * We dont decrement both since we are not allowed
 * to go diagonally.
 * If the matrix[x][y] is unset no point traversing
 * nodes underneath it. If we reach 0,0 we found our path.
 */

function findPath(x, y, id) {
  let retVal = false;
  if ((x === 0 && y === 0 ) && (matrix[0][0] === true) ) {
    retVal = true;
  } else if (matrix[x][y] === false) {
    retVal = false;
  } else if ( matrix[x][y] && (x-1 >= 0) && (y >= 0) && findPath(x-1,y) ) {
    result.unshift({'x': x-1, 'y': y});
    retVal = true;
  } else if ( matrix[x][y] && (x >= 0) && (y-1 >= 0) && findPath(x,y-1) ) {
    result.unshift({'x': x, 'y': y-1});
    retVal = true;
  }
  return retVal;
};

/**
 * Now let's  see if we Solved the puzzle
 */
function solve(id) {
  console.log('result', result);
  var args = {
    data: result,
    headers:{"Content-Type": "application/json"} 
  };
  var apiURLBase = 'https://maze.coda.io/maze/' 
  var url = apiURLBase + id + '/solve' ;

  client.post(url, args, function(data,response) {
    console.log(response.statusCode);
    if (response.statusCode === 200) {
      console.log('successfully solved!');
    } else {
       console.log('sorry wrong solution!');
    }
  });
};

try {
  // create a maze.
  client.post("https://maze.coda.io/maze", function (data2, response2) {
    // parsed response body as js object
    console.log(data2);
    // raw response statusCode.
    console.log(response2.statusCode);
    // if return value is 201  there is success. If not, throw an error
    if (response2.statusCode !== 201) {
      throw 'Maze creation failed with statusCode!' + response2.statusCode;
    }
    matrix = new Array(data2.height).fill(false).map(()=>new Array(data2.width).fill(false));
	
    // initialize the matrix.
    initializeMatrix(data2);

    setTimeout(function() {
      //printMatrix(data2);
      console.log('Finding various paths');
      if (findPath(data2.width-1, data2.height-1) ) {
        result.unshift({'x': data2.width-1, 'y': data2.height-1});
      }
      var myJSON = JSON.stringify(result.reverse());
      console.log(myJSON);
      console.log('Solving the maze...');
      solve(data2.id);
    }, 30000);
  });
  
} catch(error) {
  console.log(error);
}
