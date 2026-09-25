import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { db } from "./admin";
import type { Competition } from "./sharedTypes";

export const getActiveCompetition = onCall(
  {
    region: "europe-west1",
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://drivemydream-75f83.web.app",
      "https://drivemydream-75f83.firebaseapp.com",
    ],
  },
  async (request) => {
    logger.info("getActiveCompetition called", {
      origin: request.rawRequest.headers.origin ?? null,
      authenticated: Boolean(request.auth),
    });
    const snapshot = await db.collection("competitions").get();
    const active = snapshot.docs.find((document) => {
      const data = document.data() as Partial<Competition>;
      return (
        (typeof data.status === "string" && data.status.toLowerCase() === "active") ||
        data.isActive === true
      );
    });
    if (!active) {
      throw new HttpsError("not-found", "There is no active competition available right now.");
    }
    return { id: active.id, ...active.data() };
  }
);