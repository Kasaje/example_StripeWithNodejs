require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mySql = require("mysql");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./teststripe.db");

db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS transactionPayment(id INT, fullName TEXT, orderID INT, status TEXT, paymentIntent TEXT)"
  );
});

const app = express();
const PORT = 3000;

const packageQrCode = {
  ESSENTIAL: {
    price: 5.99,
    name: "Essential pakage OrcaCode",
  },
  PROFESSIONAL: {
    price: 10.99,
    name: "Professional pakage OrcaCode",
  },
  ULTIMATE: {
    price: 30.99,
    name: "Ultimate pakage OrcaCode",
  },
};

const checkPackage = (name) => {
  if (name.toUpperCase() == "ESSENTIAL") {
    return packageQrCode.ESSENTIAL;
  } else if (name.toUpperCase() == "PROFESSIONAL") {
    return packageQrCode.PROFESSIONAL;
  } else if (name.toUpperCase() == "ULTIMATE") {
    return packageQrCode.ULTIMATE;
  } else {
    throw { message: "package not match" };
  }
};

app.use(cors());

// const connection = mySql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "testStripe",
// });

app.get("/test", (req, res) => {
  res.send("test success.");
});

app.post("/api/checkout", express.json(), async (req, res) => {
  try {
    const { product, user } = req.body;

    const transactionID = uuidv4();
    const name = user.name;

    const selectPackage = checkPackage(product.name);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectPackage.name,
              images: [
                "https://static1.cbrimages.com/wordpress/wp-content/uploads/2023/05/minato-s-kunai-naruto.jpg",
              ],
            },
            unit_amount: selectPackage.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3333/success.html?transactionID=${transactionID}`,
      cancel_url: `http://localhost:3333/cancel.html`,
    });

    console.log("session => ", session);

    db.run(
      "INSERT INTO transactionPayment(id, fullName, orderID, status) VALUES(?, ?, ?, ?)",
      [transactionID, name, session.id, session.status]
    );

    res.json({
      user,
      product,
      checkoutUrl: session.url,
    });
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/webhook", express.json({ type: "application/json" }), (req, res) => {
  const event = req.body;

  switch (event.type) {
    case "checkout.session.completed":
      const paymentData = event.data.object;
      console.log("paymentData", paymentData);

      db.run(
        "UPDATE transactionPayment SET status = ?, paymentIntent = ? WHERE orderID = ?",
        [paymentData.status, paymentData.payment_intent, paymentData.id]
      );
      break;
    case "payment_method.attached":
      const paymentMethod = event.data.object;
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

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
