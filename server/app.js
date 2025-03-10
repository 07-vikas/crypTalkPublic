const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 8000;

// Create an HTTP server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://172.21.88.12:5500', // Update with your frontend URL
        credentials: true
    }
});

// Enable CORS
app.use(cors({
    origin: 'http://172.21.88.12:5500',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));





// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on("joinRoom", (data) => {
        const { roomId, userName, userId } = data;

        // Check if there are any existing sockets in the room (excluding the new user)
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        console.log(roomSockets);
        if (roomSockets && roomSockets.size > 0) {
            console.log(`Requesting room data from existing sockets in room ${roomId}`);

            // Send request to any one socket in the room (excluding the new user)
            const existingSocketId = [...roomSockets][0]; // Get any socket from the room
            console.log("The existing user for data req is : ", existingSocketId);
            socket.join(roomId);
            io.to(existingSocketId).emit("requestRoomData", { roomId, requestingUser: socket.id });
        }

        // socket.join(roomId);
        if (![...socket.rooms].includes(roomId)) {
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId}`);
        } else {
            console.log(`Socket ${socket.id} is already in room ${roomId}`);
        }

        socket.to(roomId).emit("newUserJoin", data);

        console.log("Socket : ", socket.id, "joined room : ", roomId);
    });

    // Receive room details from an existing socket
    socket.on("roomDataFromExistingSocket", (data) => {
        console.log("The recieved room details are : ", data);
        const { roomId, roomDetails, requestingUser } = data;


        // Forward the room details to the new user
        io.to(requestingUser).emit("joinedRoomInfo", { roomId, roomDetails });
    });

    // Listening for messages from clients
    socket.on('message', (data) => {
        console.log('Message from client:', data);

        console.log(io.sockets.adapter.rooms.get(data.roomId))

        // Broadcast the message to everyone in the room **except the sender**
        socket.to(data.roomId).emit("message", data);
    });

    //Just reloading the page so rejoining all the existing room the user is in
    socket.on("userJoin", (data) => {
        console.log(data);

        const { socketId, roomList, userId } = data;

        try {

            roomList.forEach(room => {
                socket.join(room.roomId);
                console.log(`Socket ${socket.id} joined room: ${room.roomId}`);
            });

            socket.emit("joinedRooms", roomList); // Notify client of successful join
        } catch (error) {
            console.error("Error joining rooms:", error);
        }
    });

    socket.on("roomNameUpdate", (data) => {
        console.log("Req for room name update : ", data);

        socket.to(data.roomId).emit("roomNameUpdate", data);
    });

    socket.on("updateRoomBackground", (data) => {
        console.log("Req for room background url update : ", data);

        socket.to(data.roomId).emit("updateRoomBackground", data);
    });

    socket.on("leavingRoom", (data) => {
        socket.to(data.roomId).emit("leavingRoom", data);
    });

    socket.on("leavingRooms", (data) => {
        socket.broadcast.emit("leavingRooms", data);
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});




app.get('/', (req, res) => {
    res.render('loginPageP.ejs');
});

app.get('/user', (req, res) => {
    res.render('userP.ejs');
})

app.get("/user/:roomId", (req, res) => {
    const roomId = req.params.roomId;
    res.render('chatInterfaceP.ejs'); // Serve the chat page
});

app.get("/user/:roomId/roomDetails", (req, res) => {
    const roomId = req.params.roomId;
    res.render('roomDetailsP.ejs'); // Serve the chat page
});




// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
