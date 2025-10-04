import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { db } from "./firebase-admin.js";

const app = express();
const server = createServer(app); // single server
const io = new Server(server, { cors: { origin: "*" } });

const orderTimers = new Map();

async function updateOrder(orderId) {
  const ordersSnapshot = await db
    .collection("Orders")
    .where("orderId", "==", orderId)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    return;
  }

  const doc = ordersSnapshot.docs[0];

  await db.collection("Orders").doc(doc.id).update({
    extendPrepareTime: true,
  });
}

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("start-timer", ({ orderId, duration  }) => {

    console.log("\n type \n",orderId , duration);

    let startTime, countdownDuration, interval;

    if (orderTimers.has(orderId)) {
      // Get existing timer
      ({ startTime, countdownDuration, interval } = orderTimers.get(orderId));
      clearInterval(interval); // prevent duplicate intervals

      console.log("\ninside has timer");
      

    } else {
      // Create new timer
      startTime = Date.now();
      countdownDuration = duration;
      console.log("\ninside new  timer");
    
    }

    interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const remaining = countdownDuration - elapsed;

      if (remaining <= 0) {
        await updateOrder(orderId);

        socket.emit("timer", { orderId, remaining: 0 });
        clearInterval(interval);
        orderTimers.delete(orderId);
      } else {
        socket.emit("timer", { orderId, remaining });
      }
    }, 1000);

    orderTimers.set(orderId, { startTime, countdownDuration, interval });
  });

  socket.on("delete-timer", ({ orderId }) => {
    if (orderTimers.has(orderId)) {
      clearInterval(orderTimers.get(orderId).interval);
      orderTimers.delete(orderId);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

//If you want, loop through timers and clear them
// for (let [orderId, { interval }] of orderTimers) {
//   clearInterval(interval);
//   orderTimers.delete(orderId);
// }

// // // EJS rendering logic
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views")); // safer path
app.use(express.static("public")); // if you have static files

app.get("/", (req, res) => {
  res.render("index");
});

// ✅ One server for both
const PORT = process.env.PORT || 10000; // Render sets PORT
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
