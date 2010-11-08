require('repl').start('caterwaul.db.file> ').context.db = caterwaul.clone('db.file').db.file('test-db');
