// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var path = require('path');
var bodyParser = require('body-parser');
var mysql = require('mysql2');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

var chatUsers = {};

var con = mysql.createConnection({
  host: '192.168.1.121',
  user: 'root',
  password: 'sa',
  database: 'nodejs'
});

app.use(bodyParser());

// EJS
app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

// Routing
app.use(express.static(__dirname + '/public'));

app.get('/bower_components/*', function (req, res) {
  res.sendfile(__dirname + '/bower_components/' + req.params[0]);
});

app.get('/scripts/*', function (req, res) {
  res.sendfile(__dirname + '/public/scripts/' + req.params[0]);
});

app.post('/xhr', function (req, res) {
  if (req.xhr) {
    switch (req.body.cmd) {
      case 'getData':
        res.send(JSON.stringify(chatUsers));
        break;
      case 'getList':
        res.render('users', {
          users: chatUsers
        });
        break;
    }
  } else {
    res.status(404).send('use xhr');
  }
});

app.get('/xhr', function (req, res) {
  res.status(404).send('use post');
});


// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
    chatUsers[socket.username].lastMsg = Math.floor(new Date().getTime() / 1000);
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    chatUsers[username] = {
      'name': username,
      'email': username + '@example.com',
      'lastMsg': ''
    };

    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      delete chatUsers[socket.username];

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.on('f1', function () {
    console.log('exec f1');
    con.query('select id from user where name="hiyam" and password="password" limit 1', function (err, rs, f) {
      socket.emit('f1', {
        'result': rs[0].id
      });
    });
  });

  socket.on('f2', function () {
    console.log('exec f2');
    socket.emit('f2', {
      'result': 'f2 executed'
    });
  });
});