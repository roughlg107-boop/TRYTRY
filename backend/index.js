import "dotenv/config";
import express from "express";
import cors from "cors";
import extractRouter from "./routes/extract.js";
import templatesRouter from "./routes/templates.js";
import suggestRouter from "./routes/suggest.js";
import generateRouter from "./routes/generate.js";
import guardRouter from "./routes/guard.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/v1/extract-visit-report", extractRouter);
app.use("/api/v1/templates", templatesRouter);
app.use("/api/v1/suggest-templates", suggestRouter);
app.use("/api/v1/generate-presentation", generateRouter);
app.use("/api/v1/guard", guardRouter);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
