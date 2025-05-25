const express = require("express");
const prisma = require("./config/prismaClient");
const userRouter = require("./routes/user.route");
const storeRouter = require("./routes/store.route");
const ratingRouter = require("./routes/rating.route");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 16 * 60 * 100,
  max: 10,
  message: "Too many requests from this IP, please try again later.",
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/store", storeRouter);
app.use("/api/rating", ratingRouter);

async function startServer() {
  try {
    // Establish DB Connection
    await prisma.$connect();
    console.log("Connected to PostgreSQL DB via Prisma");

    app.listen(port, () => {
      console.log("i am listening on", port);
    });
  } catch (error) {
    console.error(" Error connecting to the database:", error);
    process.exit(1);
  }
}

startServer();
