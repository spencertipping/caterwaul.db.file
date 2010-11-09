// Indexed flat-file database | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This is a simple database designed for prototyping and perhaps small-scale production use. The goals are to be (1) indestructible (i.e. you can't lose data), (2) easily managed, (3) instant to
// setup, and (4) reasonably quick (in case you do need to use it for real applications). It doesn't provide any sort of transactions, record locking, etc -- it's just a key-value store that is
// easily inspected and backed up with rsync.

// All records are stored as plain-text with JSON values. This means that you can write an adapter to the database in just a few lines of code in a language with good regexp support. It also
// enables very easy recovery in case something goes wrong.

caterwaul.node_require || caterwaul.field('node_require', require);
caterwaul.tconfiguration('std iter error', 'db.file', function () {

// Creating a database.
// You can create a database in a directory by saying this (the directory doesn't have to exist ahead of time):

// | var db = caterwaul.db.file('directory-name');

// You can then start using the database immediately. Note that this call does block on directory creation.

//   Options.
//   You can change the mode of the database directories that get created. By default 0744 is used, so the process user is the only one who can browse database objects. To change this, you can
//   pass in a different mode:

//   | var db = caterwaul.db.file('directory-name', {mode: 0755});

// Object model.
// Every object is append-only. An object's lifecycle comes in two stages. First, it is created (this is done when someone creates a reference to it) and then it is modified any number of times.
// Objects are always stored in delta format, one record per line. Each record signifies an edit of some sort, and loading an object is done by replaying the edit log (this is done on the client
// to reduce server load, though it should be a trivial enough operation even on the server).

// Each update marks a simple value of a field, which is JSON-encoded. If you're going to have lots of data in a single field, it's probably best to allocate separate objects. That way your
// changelogs don't get huge, which they easily can if you have large arrays of JSON objects or some such.

//   Field updates.
//   Field updates are all done individually and are optimistically indexed. Later on when searches are performed the relevance-sorting stage culls entries that are no longer relevant. This
//   enatils space usage of O(n) for n edits, and not substantially worse than storing the objects without indexes. Indexes are also append-only. So, for example, here is the content of an object
//   file:

//   | time:field=value  (update)

//   The file name is something like /objects/195_/_gensym_foo_bar195_, where _gensym_foo_bar195_ is the object ID. Times are stored as numbers -- whatever new Date().getTime() returns. For
//   consistency, all times are assigned by the server.

//   You create and update objects by calling the database on an ID:

//   | db()                                // -> a new object -- its ID is available by calling id()
//     db().id                             // -> the ID of a newly created object
//     db('id').get(callback)              // calls the callback on the object after replaying the changelog
//     db('id').log(callback)              // calls the callback on the array of changelog objects
//     db('id').update('field', value)     // updates the object and returns db('id') -- creates if the object doesn't exist. Takes an optional callback to be invoked when the update is finished
//     db([change1, change2, ...])         // creates a DB object from a set of changes and returns the DB interface to that object
//     db({foo: 'bar', bif: 'baz'})        // creates a DB object from a JS object and returns the DB interface to that object

//   Indexes.
//   Indexes are constructed by tagging particular words. For example, a field edit of 'title' to 'foo bar bif' would probably want to create entries to the object for 'title:foo', 'title:bar',
//   and 'title:bif'. This would update each of the files /indexes/title:foo, /indexes/title:bar, and /indexes/title:bif. The database provides an interface for indexing things (which is always
//   done manually):

//   | db('id').index('title:foo', 'title:bar', 'title:bif');
//     db('id').index(['title:foo', 'title:bar', 'title:bif']);    // same as the first call

//   You can later retrieve things based on those indexes:

//   | db.index('title:foo', function (items) {...});                  // everything in the 'foo' index

//   The log.
//   The database keeps a log of every update as it is requested. Each entry is timestamped when it gets added to this log, which makes this log an authoritative data source. Because it is likely
//   to become quite large, it is rotated daily. Here is an example of one such log file, /log/objects-2010-10-30:

//   | _object_id_@time:field=value

//   Logs are also kept for indexes. An example index log, /log/index-2010-10-30:

//   | _object_id_@time:index1
//     _object_id_@time:index2

//   Notice that the index file is not stored in compiled form; it's stored to mirror the arguments of the db('id').index() call.

// Properties of objects.
// Algebraically speaking, objects have some useful properties. Obviously changes are not commutative, but they are associative. They also are independent in the sense that you can remove any
// change or set of changes and still have a valid object definition. (This isn't true of a textual diff, for instance, since text diffs don't have well-defined slots.)

  var fs = this.node_require('fs'), path = this.node_require('path'), db = this.db || this.shallow('db', {}).db,
      file = db.file = fn[dir, options][file.shell(dir, options)],
      mkdir_p_sync = fn[dir, mode][error.quietly[fs.statSync(dir)] || (mkdir_p_sync(path.dirname(dir), mode), fs.mkdirSync(dir, mode))];

// External interface.
// First we need to make sure that the objects, indexes, and log directories exist. Those can be created synchronously, since one doesn't generally initialize databases midway through an
// application's lifecycle (and nobody wants to write DB-initialization code in CPS either). I may add an asynchronous interface later on.

  file.shell = fn[dir, options][
    options = this[caterwaul].util.merge({mode: 0744, file_limit: 100, filehandle_wait: 1}, options || {}),

    mkdir_p_sync('#{dir}/objects', options.mode),
    mkdir_p_sync('#{dir}/log',     options.mode),
    mkdir_p_sync('#{dir}/indexes', options.mode),

    let*[result = caterwaul.util.merge(
      caterwaul.util.extend(fn[x][this.constructor === result ? (this.id = x) :
                                  x === undefined          ? result.create()  : x.constructor === String ? result.get(x) :
                                  x.constructor === Object ? result.create(x) : x.constructor === Array  ? result.create(x) :
                                  error.fail[new Error('Invalid parameter to caterwaul.db.file: #{x}')]],

//   Instance methods of objects.
//   We can easily construct objects given the ID and a reference to the database. The object relationship here is a little strange, but very cool. When you obtain a database, like this:

//   | var db = caterwaul.db.file('foo');

//   You actually get a constructor function. However, you don't normally call it this way (though you could). It is a class specific to the database. When you ask for a record:

//   | var record = db('some_record_id');
//     record instanceof db                        // -> true
//     record.constructor === db                   // -> true
//     record instanceof caterwaul.db.file('bar')  // -> false
//     record instanceof caterwaul.db.file('foo')  // -> not necessarily true (though I'm not making any promises)

//   The database constructor function has closure state, so you could also create record shells this way:

//   | var record = new db('some_record_id');

//   However, you shouldn't for a couple of reasons:

//   | 1. There is no guarantee that the API won't change later
//     2. It makes the interface really counterintuitive and people won't understand what you're doing

    {update: fn[field, value, cc][this.constructor.object_append(this.id, {time: +new Date(), field: field, value: value}, cc), this],
        get: fn[cc][this.log(fb[changes][cc(this.constructor.assemble(changes))])],
        log: fn[cc][this.constructor.read_object(this.id, cc), this],

      index: fn_[let[as = arguments][iter.n[i, as.length][as[i].constructor === Array ? iter.n[j, as[i].length][this.index(as[i][j])] : this.constructor.index_append(this.id, as[i])], this]]}),

//   Static (database-level) methods.
//   Databases have all of the logic to process changelog files and indexes. The record interface is really just a shell around these methods, though you should probably use it because it's so
//   intuitive and awesome :).

//     Public interface.
//     These methods are meant for external use. The rest of them below are more for internal use, though you might need them for some reason.

      {index: fn[index, cc][this.data_for(this.index_filename_for(index), fn[data][cc(data.split(/\n/).filter(fn[x][x.length]))]), this],

//     File handle limits.
//     We can't open too many files at once; otherwise there will be an error not here but in the global event loop (!) instead. To prevent this, there's a file_limit option that you can specify
//     to the DB constructor (by default 100) to prevent more than that many file operations from happening at once.

      allocate_filehandle: let[allocated = 0, limit = options.file_limit, wait_time = options.filehandle_wait] in
                           fn[when_available][allocated < limit ? (++allocated, when_available(fn_[--allocated])) : setTimeout(fb_[this.allocate_filehandle(when_available)], wait_time)],

//     Directory partitioning.
//     I'm assuming we'll have a lot of objects in this database, and most filesystems can't take more than about 30,000 entries in a directory before slowing down or dying altogether. The
//     database uses partitioning on the last two characters of the filename, which are base-36 values. (This means that we end up with 1296 directories with files distributed evenly between
//     them.)

      object_directory_for: fn[id]['#{dir}/objects/#{id.substring(id.length - 2)}'],
       object_filename_for: fn[id]['#{this.object_directory_for(id)}/#{id}'],
        index_filename_for: fn[id]['#{dir}/indexes/#{id}'],

                 unique_id: fn_[let[parts = /_gensym_([^_]+)_([^_]+)_/.exec(this[caterwaul].gensym())] in 'object_#{parts[1]}_#{parts[2]}'],

//     Object creation and retrieval.
//     This is actually really simple. Object shells behave the same regardless of whether the object exists, so all we have to do is set them up with an ID. The only case where this isn't true
//     is if we are given an object or an array; in this case we actually create the object on disk and return an interface to it.

               get: fn[id][new this(id)],
            create: fn[id][id === undefined ? new this(this.unique_id()) : id.constructor === Object ? this.create(this.disassemble(id)) :
                           id.constructor === Array ? let[result = new this(this.unique_id())][iter.n[i, id.length][this.append(result.id, id[i])], result] :
                           error.fail[new Error('Invalid parameter to caterwaul.db.file.create: #{id}')]],

//     Object access and parsing.
//     This is provided at two levels. You can request the raw file contents (an empty string if the file doesn't exist), but most of the time you'll probably want to have the parsed contents
//     instead. Parsing is a simple process; it just entails converting each line in the file into an object of the form {time: n, field: 'f', value: x}, where the 'value' field has been run
//     through a JSON parse. Any row that doesn't parse correctly is left as a string.

          data_for: fn[filename, cc][this.allocate_filehandle(fn[release][fs.readFile(filename, 'utf8', fn[err, data][release(), cc(data || '')])])],
        parse_data: fn[data][let[lines = data.split(/\n/), match = null] in
                             (iter.n[i, lines.length][(match = /^(\d+):(\w+)=(.*)$/.exec(lines[i])) && (lines[i] = {time: Number(match[1]), field: match[2], value: JSON.parse(match[3])})],
                              lines)],

       read_object: fn[id, cc][this.data_for(this.object_filename_for(id), fb[data][cc(this.parse_data(data))])],

//     Global logging.
//     We write to whichever log represents today. This is a simple function of the current date (doesn't really matter whether it's UTC or local, as long as it's consistent).

      current_date: fn_[let[now = new Date(), format = fn[n][n < 10 ? '0#{n}' : n]] in '#{now.getFullYear()}-#{format(now.getMonth())}-#{format(now.getDate())}'],
        object_log: fn_['#{dir}/log/objects-#{this.current_date()}'],
         index_log: fn_['#{dir}/log/index-#{this.current_date()}'],

//     File appends.
//     It's possible to run out of filehandles and possibly reorder data if we're not careful. To avoid this we keep a couple of hashes around. One of them maps filenames to existing
//     write-streams, and the other maps filenames to arrays of data to be written. There's also an optimistic error handler that catches the too-many-filehandles error and retries after a few
//     milliseconds.

       file_append: let*[filehandles = {}, write_stream_for(filename, cc) = filehandles[filename] ? cc(filehandles[filename]) : fs.createWriteStream(filename, {flags: 'a+'}),
                         requests    = {}, requests_for(filename)     = requests[filename]    || [],
                         callbacks   = {}, callbacks_for(filename)    = callbacks[filename]   || [],

                         ensure_directory_for(filename, cc)     = path.exists(path.dirname(filename), fn[exists][exists ? cc() : fs.mkdir(path.dirname(filename), options.mode, cc)]),
                         create_request_for(filename, data, cc) = ensure_directory_for(filename,
                                                                    fn_[(requests[filename]  = requests_for (filename)).push(data),
                                                                        (callbacks[filename] = callbacks_for(filename)).push(cc), process.nextTick(handle_next_request_for(filename))]),
                         handle_next_request_for(filename)()    = (requests_for(filename).length ?
                           h.write(requests[filename].shift(), 'utf8', handle_next_request_for(filename)) :
                           (h.end(), callbacks_for(filename).forEach(fn[f][f && f()]), requests[filename] = filehandles[filename] = callbacks[filename] = undefined),
                         where[h = write_stream_for(filename)])] in

                    fn[filename, line, cc][create_request_for(filename, '#{line}\n', cc)],

//     Object updates.
//     This is provided just at the high-level. There isn't a way to append arbitrary data to a file, since it would be very easy to corrupt the database using that API. Instead you have to
//     construct proper change objects and let the database serialize them for you.

         serialize: fn[change]['#{change.time}:#{change.field}=#{JSON.stringify(change.value)}'],

      index_append: fn[object_id, index, cc][this.file_append(this.index_log(), '#{object_id}@#{+new Date()}:#{index}'), this.file_append(this.index_filename_for(index), object_id, cc)],
     object_append: fn[id, change, cc][let[change = this.serialize(change)][this.file_append(this.object_log(), '#{id}:#{change}'), this.file_append(this.object_filename_for(id), change, cc)]],

//     Assembly and disassembly.
//     Given a changelog, we want to construct an object, and given an object we want to construct a minimal changelog.

          assemble: fn[changes][let[object = {}][iter.n[i, changes.length][changes[i].constructor === Object && (object[changes[i].field] = changes[i].value)], object]],
       disassemble: fn[object][let[changes = []][iter.keys[k, object][changes.push({time: +new Date(), field: k, value: object[k]}), when[object.hasOwnProperty(k)]], changes]]})] in result];
});

// Generated by SDoc 
