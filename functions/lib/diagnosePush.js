"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosePush = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const expo_server_sdk_1 = __importDefault(require("expo-server-sdk"));
/**
 * One-shot Android push diagnostic. Hit with:
 *   curl -s "https://us-central1-humm-f31c7.cloudfunctions.net/diagnosePush?key=letmein&uid=<UID>"
 *
 * Reports: token presence/validity, sends a test push, then waits 7 seconds
 * and fetches the Expo push RECEIPT for the ticket — receipts (not tickets)
 * are what surface FCM credential / channel / sender-id failures.
 *
 * Temporary diagnostic only — remove after the partner's push pipeline is
 * confirmed working.
 */
exports.diagnosePush = (0, https_1.onRequest)({ region: "us-central1", cors: true }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (req.query.key !== "letmein") {
        res.status(401).json({ error: "unauthorized" });
        return;
    }
    const uid = String((_a = req.query.uid) !== null && _a !== void 0 ? _a : "");
    if (!uid) {
        res.status(400).json({ error: "uid query parameter required" });
        return;
    }
    const result = { uid };
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists) {
        result.error = "user doc not found";
        res.json(result);
        return;
    }
    const data = (_b = snap.data()) !== null && _b !== void 0 ? _b : {};
    const token = (_c = data.fcmToken) !== null && _c !== void 0 ? _c : null;
    const partnerId = (_d = data.partnerId) !== null && _d !== void 0 ? _d : null;
    const displayName = (_e = data.displayName) !== null && _e !== void 0 ? _e : null;
    const prefs = (_f = data.notificationPreferences) !== null && _f !== void 0 ? _f : null;
    result.displayName = displayName;
    result.partnerId = partnerId;
    result.fcmTokenPresent = !!token;
    result.fcmTokenPrefix = token ? token.slice(0, 30) + "…" : null;
    result.isValidExpoToken = token ? expo_server_sdk_1.default.isExpoPushToken(token) : false;
    result.notificationPreferences = prefs;
    if (!token || !expo_server_sdk_1.default.isExpoPushToken(token)) {
        result.verdict =
            "no valid Expo push token saved on this user — open the app and grant notification permission";
        res.json(result);
        return;
    }
    const expo = new expo_server_sdk_1.default();
    const message = {
        to: token,
        title: "test push",
        body: "if you can read this on android, the channel + FCM pipeline works",
        sound: "default",
        channelId: "default",
        priority: "high",
        data: { feature: "reminders", screen: "/" },
    };
    let tickets = [];
    try {
        tickets = await expo.sendPushNotificationsAsync([message]);
    }
    catch (e) {
        result.sendError = e.message;
        res.json(result);
        return;
    }
    const ticket = tickets[0];
    result.ticket = ticket;
    if (!ticket || ticket.status !== "ok") {
        result.verdict = "Expo rejected the push at ticket stage";
        res.json(result);
        return;
    }
    const ticketId = ticket.id;
    result.ticketId = ticketId;
    // Wait long enough for Expo to attempt FCM delivery (~5 sec is usually enough,
    // give it 7 to be safe).
    await new Promise((r) => setTimeout(r, 7000));
    try {
        const receipts = await expo.getPushNotificationReceiptsAsync([ticketId]);
        result.receipts = receipts;
        const r = receipts[ticketId];
        if (!r) {
            result.verdict =
                "no receipt yet (try again in 30s — Expo can take time to fan out to FCM)";
        }
        else if (r.status === "ok") {
            result.verdict =
                "Expo says FCM accepted delivery. If notification still doesn't appear: check Android Settings → Hum → Notifications is on, battery optimisation is off, and Do Not Disturb is off";
        }
        else {
            result.verdict = `FCM-side failure: ${(_g = r.message) !== null && _g !== void 0 ? _g : "see details"}`;
        }
    }
    catch (e) {
        result.receiptError = e.message;
    }
    res.json(result);
});
//# sourceMappingURL=diagnosePush.js.map