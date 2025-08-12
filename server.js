import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const server = createServer(app); // single server
const io = new Server(server, { cors: { origin: "*" } });

const orderTimers = new Map();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("start-timer", ({ orderId, duration }) => {
    let startTime, countdownDuration, interval;

    if (orderTimers.has(orderId)) {
      // Get existing timer
      ({ startTime, countdownDuration, interval } = orderTimers.get(orderId));
      clearInterval(interval); // prevent duplicate intervals
    } else {
      // Create new timer
      startTime = Date.now();
      countdownDuration = duration;
    }

    interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = countdownDuration - elapsed;

      if (remaining <= 0) {
        socket.emit("timer", { orderId, remaining: 0 });
        clearInterval(interval);
        orderTimers.delete(orderId);
      } else {
        socket.emit("timer", { orderId, remaining });
      }
    }, 1000);

    orderTimers.set(orderId, { startTime, countdownDuration, interval });

    console.log(orderTimers, "orderTimers");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    //If you want, loop through timers and clear them
    // for (let [orderId, { interval }] of orderTimers) {
    //   clearInterval(interval);
    //   orderTimers.delete(orderId);
    // }
  });
});

// // EJS rendering logic
// app.set("view engine", "ejs");
// app.set("views", path.join(process.cwd(), "views")); // safer path
// app.use(express.static("public")); // if you have static files

// app.get("/", (req, res) => {
//   res.render("index");
// });

// ✅ One server for both
server.listen(3000, () => {
  console.log("Server + WebSocket running on http://localhost:3000");
});
