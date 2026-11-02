import "dotenv/config";
import { createApp, prepare } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

prepare()
  .catch((error) => {
    console.error("[endless] preparation failed", error);
  })
  .finally(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`[endless] API listening on http://localhost:${port}`);
    });
  });
