/*
Todos

Complete CRUD
User auth
User list
Secure api
Dynamic Collections, for chat embed service type of thing
Use a css framework to make it look good

build simple authentication
store user list in chatroom
remove user when they close window
make chatrooms embeddable

PONG GAME!!!

Dynamic Pages and posts

How to import js files here?!?!?!

****/


// Project name: SocketIO
var express      = require('express');
var app          = express();
var http         = require('http').Server(app);
var io           = require('socket.io')(http);
var mongoose     = require('mongoose');
var cookieParser = require('cookie-parser');
var port         = process.env.PORT || 3001;
var router = express.Router();
var sanitizer = require('sanitizer');

// Session stuff
var session    = require('express-session');
var MongoStore = require('connect-mongo')(session);

// Set static file folder
app.use(express.static('assets'));
// app.use(express.static('public'));

// Set the template engine
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

// app.engine('html', require('ejs').renderFile);

// Cookie Parser
app.use(cookieParser('secret-string'));
// app.use(function(req, res, next){
//    res.end(JSON.stringify(req.cookies));
// })

// Log HTTP requests
var logger = require('morgan');
app.use(logger(':remote-addr :method :url'));

// MongoDB Connection
mongoose.connect('mongodb://localhost/socketio');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('Connected to MongoDB!!!');
});

// MongoDB Session Store
app.use(session({
    secret: 'secret-cookie-string',
    name: 'user_session_id',
    cookie: { path: '/', httpOnly: false, secure: false, maxAge: 1209600 },
    store: new MongoStore({
        db: 'socketio',
        collection: 'sessions',
        host: '127.0.0.1',
        port: 27017,
        username: '',
        password: '',
        ssl: false,
        mongoose_connection: db
    })
}));

// DEFINE collections
var Chat = mongoose.model( 'Message', {
    name: String,
    message: String,
    time: Date
});
var User = mongoose.model( 'User', {
    nickname: String,
    socket_id: String,
    message_count: Number
});
var Session = mongoose.model( 'Session', {
    type: String,
    name: String,
    ip: String,
    duration: Number
});

// Static routes
app.get('/',            function(req, res){ res.render('index'); });
app.get('/chat',        function(req, res){ res.render('chat', { title: 'Chat' }); });
app.get('/rproxy',      function(req, res){ res.render('proxy-nginx'); });
app.get('/template',    function(req, res){ res.render('template'); });

// API
app.get('/api/:id?', function(req, res, next) {
    console.log( 'you hit our api' );
    res.end(JSON.stringify( req.params.id ));
    // next();
});
/*
*
* Socket IO Stuff!
*
*/
// Connection made to socket
io.on('connection', function(socket){
    //:: On connect
    // 1. ask for nick name
    // 2. create cooke with name
    // 3. store name in database
    // 4. add send name to client
    // 5. add name to user list on client


    // :: Leave chat
    // 1. remove user from database
    // 2. update user list on clients

    //:: Return to chat
    // 1. check for cookie
    // 2.  if cookie send chat room
    // set a cookie

    // Get ALL messages
    // Send all messages to client as object
    Chat.find({ },function (err, messages) {
        if (err) return console.error(err);
        socket.emit('connected', messages);
    });

    // var session = new User({ name: '-', ip: 'ip'  });
    // session.save(function (err) {
    //     if( err ){
    //         console.log( err )
    //     }
    // });

    // Someone sends a message
    socket.on('chat message', function(data){
        var san_message = sanitizer.escape(data.message);
        var message = new Chat({ name: data.name, message: san_message });
        // Save Message to MongoDB
        message.save(function (err) {
            // Handle errors ***
            if( err ){
                io.emit('chat message', 'Something went wrong while saving your message');
            } else {
                // console.log( 'Message saved to MongoDB: ' + msg );
                // Send message to all sockets including yours!
                io.emit('chat message', { name: data.name, message: san_message });
            }
        });
    });
    socket.on('nickname selected', function(nickname){
        var user = new User({nickname: nickname, socket_id: socket.id});
        user.save(function(err){
            if( !err ){
                User.find({ },function (err, users) {
                    if( !err ){
                        io.emit( 'update user list', users);
                        socket.broadcast.emit('joined', nickname);
                    }
                });
            }
        });
    });
    socket.on('disconnect', function( res ){
        User.remove({socket_id: socket.id}, function(err){
            User.find({ },function (err, users) {
                if( !err ){
                    io.emit( 'update user list', users);
                }
            });

        });
    });





    // Broadcast your mouse position!
    socket.on('mouse_position', function(pos){
        pos.id = socket.id;
        socket.broadcast.emit('show_mouse', pos);
    });
    // Remove your mouse icon when you disconnect
    socket.on('disconnect', function( res ){
        socket.broadcast.emit('remove_cursor', socket.id );
    });


}); // end io connect


// Start server
http.listen(port, function(){
    console.log('listening on port ' + port);
});
