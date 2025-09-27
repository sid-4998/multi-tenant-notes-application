const express = require("express");
const serverless = require("serverless-http");
const authRoutes = require('../routes/authRoute');
const noteRoutes = require('../routes/notesRoute');
const tenantRoutes = require('../routes/tenantRoute');
const healthRoutes = require('../routes/health');

const app = express();

app.use(cors());              // allow cross-origin requests
app.use(express.json());      // parse JSON bodies

app.use('/auth', authRoutes);
app.use('/notes', noteRoutes);
app.use('/tenants', tenantRoutes);
app.use('/health', healthRoutes);

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

module.exports.handler = serverless(app);
