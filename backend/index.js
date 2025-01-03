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
            images: [
              "https://static1.cbrimages.com/wordpress/wp-content/uploads/2023/05/minato-s-kunai-naruto.jpg",
            ],
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

  console.log("session => ", session);
  res.json({
    user,
    product,
    checkoutUrl: session.url,
  });
});

app.post("/webhook", express.json({ type: "application/json" }), (req, res) => {
  const event = req.body;

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const paymentData = event.data.object;
      console.log("paymentData", paymentData);
      break;
    case "payment_method.attached":
      const paymentMethod = event.data.object;
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

app.get("/checkPayment", express.json(), async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    req.body.paymentID
  );

  res.json({
    paymentIntent,
  });
});

app.post("/refund", express.json(), async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const refund = await stripe.refunds.create({
    charge: req.body.chargeID,
  });

  res.json({
    refund,
  });
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
