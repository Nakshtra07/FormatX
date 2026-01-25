const express = require("express");
const cors = require("cors");
const formatRoute = require("./routes/format");const googleAuth = require("./routes/googleAuth");
const googleDocs = require("./routes/googleDocs");


const app = express();
app.use(cors());
app.use(express.json());

app.use("/format", formatRoute);

app.use("/auth/google", googleAuth);
app.use("/api/google-docs", googleDocs);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
