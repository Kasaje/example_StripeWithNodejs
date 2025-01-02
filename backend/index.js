require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mySql = require("mysql");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

app.use(cors());

const connection = mySql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "testStripe",
});

app.get("/test", (req, res) => {
  res.send("test success.");
});

app.post("/api/checkout", express.json(), async (req, res) => {
  const { product, user } = req.body;

  const orderId = uuidv4();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "thb",
          product_data: {
            name: product.name,
          },
          unit_amount: product.price * 100,
        },
        quantity: product.quantity,
      },
    ],
    mode: "payment",
    success_url: `http://localhost:3333/success.html?orderId=${orderId}`,
    cancel_url: `http://localhost:3333/cancel.html`,
  });

  res.json({
    user,
    product,
    checkoutUrl: session.url,
  });
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
