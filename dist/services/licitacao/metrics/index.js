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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMatchingScore = exports.calculateTaxonomiaScore = exports.calculateTfidfScore = exports.calculateLevenshteinScore = exports.calculateRegexScore = exports.normalizeText = void 0;
// Exporta todas as funções de métricas em um módulo centralizado
var textNormalization_1 = require("./textNormalization");
Object.defineProperty(exports, "normalizeText", { enumerable: true, get: function () { return textNormalization_1.normalizeText; } });
var regexScore_1 = require("./regexScore");
Object.defineProperty(exports, "calculateRegexScore", { enumerable: true, get: function () { return regexScore_1.calculateRegexScore; } });
var levenshteinScore_1 = require("./levenshteinScore");
Object.defineProperty(exports, "calculateLevenshteinScore", { enumerable: true, get: function () { return levenshteinScore_1.calculateLevenshteinScore; } });
var tfidfScore_1 = require("./tfidfScore");
Object.defineProperty(exports, "calculateTfidfScore", { enumerable: true, get: function () { return tfidfScore_1.calculateTfidfScore; } });
var taxonomiaScore_1 = require("./taxonomiaScore");
Object.defineProperty(exports, "calculateTaxonomiaScore", { enumerable: true, get: function () { return taxonomiaScore_1.calculateTaxonomiaScore; } });
var matchingCalculator_1 = require("./matchingCalculator");
Object.defineProperty(exports, "calculateMatchingScore", { enumerable: true, get: function () { return matchingCalculator_1.calculateMatchingScore; } });
__exportStar(require("./types"), exports);
