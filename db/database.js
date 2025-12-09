const mongoose = require("mongoose");

const connectToDB = () => {
  mongoose
    .connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((data) => {
      console.log(`mongodb connect with server: ${data.connection.host}`);
    });
    console.log("Connected DB:", mongoose.connection.name);

};

module.exports = connectToDB;
