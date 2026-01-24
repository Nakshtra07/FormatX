const express = require("express");
const cors = require("cors");
const formatRoute = require("./routes/format");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/format", formatRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
