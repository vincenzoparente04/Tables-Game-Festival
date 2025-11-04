"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_EXPIRATION = exports.JWT_EXPIRATION = exports.JWT_SECRET = void 0;
require("dotenv/config");
exports.JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';
exports.REFRESH_EXPIRATION = process.env.REFRESH_EXPIRATION || '7d';
if (!exports.JWT_SECRET) {
    throw new Error('JWT_SECRET manquant dans .env');
}
