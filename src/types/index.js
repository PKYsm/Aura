"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoopMode = exports.PremiumTier = void 0;
var PremiumTier;
(function (PremiumTier) {
    PremiumTier[PremiumTier["FREE"] = 0] = "FREE";
    PremiumTier[PremiumTier["BASIC"] = 1] = "BASIC";
    PremiumTier[PremiumTier["PRO"] = 2] = "PRO";
    PremiumTier[PremiumTier["LIFETIME"] = 3] = "LIFETIME";
})(PremiumTier || (exports.PremiumTier = PremiumTier = {}));
var LoopMode;
(function (LoopMode) {
    LoopMode[LoopMode["NONE"] = 0] = "NONE";
    LoopMode[LoopMode["TRACK"] = 1] = "TRACK";
    LoopMode[LoopMode["QUEUE"] = 2] = "QUEUE";
})(LoopMode || (exports.LoopMode = LoopMode = {}));
