// Test for multiple simultaneous writes to the same record

caterwaul.clone('std seq db.file')(function () {
  var db          = caterwaul.db.file('test-db'),
      long_string = 'c';

  var range = fn[n][seq[0 >>>[_ + 1] <<[_ < n]]];

  seq[range(16) *![long_string += long_string]];
  seq[range(100) *!i[db('record')({foo: long_string + i}),
                     db('record#{i}')({bar: i + long_string})]];

  setTimeout(fn_[
    db('record')(fn[r][null['#{r.foo} was not #{long_string + 99}'], unless[r.foo === long_string + 99]]),
    seq[range(100) *!i[db('record#{i}')(let[k = i] in fn[r][null['#{r.bar} was not #{k}#{long_string}'], unless[r.bar === k + long_string]])]]], 2000);
})();

// Generated by SDoc 
