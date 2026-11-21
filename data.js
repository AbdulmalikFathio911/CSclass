/*
  بيانات كورس MIT 6.100L (Fall 2022).
  المصدر: MIT OpenCourseWare، صفحات calendar و material-by-lecture و lists/problem-sets.
  - عناوين المحاضرات وروابطها: من صفحة material-by-lecture.
  - week / out / half / due: من صفحة calendar (الموقع يعطي أسابيع ومحاضرات، بدون تواريخ).
  - روابط الواجبات: من صفحة lists/problem-sets.
*/
(function () {
  'use strict';

  var BASE = 'https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022';

  var lectures = [
    [1, 1, 'Introduction', 'lecture-1-introduction'],
    [2, 2, 'Strings, Input/Output, Branching', 'lecture-2-strings-inputoutput-branching'],
    [3, 2, 'Iteration', 'lecture-3-iteration'],
    [4, 3, 'Loops over Strings, Guess-and-Check, Binary', 'lecture-4-loops-over-strings-guess-and-check-binary'],
    [5, 3, 'Floats and Approximation Methods', 'lecture-5-floats-and-approximation-methods'],
    [6, 4, 'Bisection Search', 'lecture-6-bisection-search'],
    [7, 4, 'Decomposition, Abstraction, Functions', 'lecture-7-decomposition-abstraction-functions'],
    [8, 5, 'Functions as Objects', 'lecture-8-functions-as-objects'],
    [9, 5, 'Lambda Functions, Tuples, and Lists', 'lecture-9-lambda-functions-tuples-and-lists'],
    [10, 6, 'Lists, Mutability', 'lecture-10-lists-mutability'],
    [11, 7, 'Aliasing, Cloning', 'lecture-11-aliasing-cloning'],
    [12, 7, 'List Comprehension, Functions as Objects, Testing, Debugging', 'lecture-12-list-comprehension-functions-as-objects-testing-debugging'],
    [13, 8, 'Exceptions, Assertions', 'lecture-13-exceptions-assertions'],
    [14, 8, 'Dictionaries', 'lecture-14-dictionaries'],
    [15, 9, 'Recursion', 'lecture-15-recursion'],
    [16, 9, 'Recursion on Non-Numerics', 'lecture-16-recursion-on-non-numerics'],
    [17, 10, 'Python Classes', 'lecture-17-python-classes'],
    [18, 10, 'More Python Class Methods', 'lecture-18-more-python-class-methods'],
    [19, 11, 'Inheritance', 'lecture-19-inheritance'],
    [20, 11, 'Fitness Tracker Object-Oriented Programming Example', 'lecture-20-fitness-tracker-object-oriented-programming-example'],
    [21, 12, 'Timing Programs, Counting Operations', 'lecture-21-timing-programs-counting-operations'],
    [22, 13, 'Big Oh and Theta', 'lecture-22-big-oh-and-theta'],
    [23, 13, 'Complexity Classes Examples', 'lecture-23-complexity-classes-examples'],
    [24, 14, 'Sorting Algorithms', 'lecture-24-sorting-algorithms'],
    [25, 14, 'Plotting', 'lecture-25-plotting'],
    [26, 15, 'List Access, Hashing, Simulations, and Wrap-Up', 'lecture-26-list-access-hashing-simulations-and-wrap-up']
  ].map(function (r) {
    return { id: r[0], week: r[1], title: r[2], url: BASE + '/pages/' + r[3] + '/' };
  });

  /* out = محاضرة الطرح، half = محاضرة تسليم المنتصف، due = محاضرة التسليم النهائي */
  var psets = [
    { id: 'ps0', title: 'Problem Set 0', out: 1, half: null, due: null, graded: false },
    { id: 'ps1', title: 'Problem Set 1', out: 2, half: 5, due: 9, graded: true },
    { id: 'ps2', title: 'Problem Set 2', out: 9, half: 10, due: 12, graded: true },
    { id: 'ps3', title: 'Problem Set 3', out: 12, half: 14, due: 16, graded: true },
    { id: 'ps4', title: 'Problem Set 4', out: 16, half: 18, due: 20, graded: true },
    { id: 'ps5', title: 'Problem Set 5', out: 20, half: 23, due: 25, graded: true }
  ].map(function (p) {
    p.url = BASE + '/resources/mit6_100l_f22_' + p.id + '_pdf/';
    return p;
  });

  window.MASAR_DATA = {
    course: {
      code: 'MIT 6.100L',
      term: 'Fall 2022',
      title: 'Introduction to CS and Programming using Python',
      instructor: 'Dr. Ana Bell',
      url: BASE + '/',
      license: 'CC BY-NC-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
    },
    lectures: lectures,
    psets: psets
  };
})();
